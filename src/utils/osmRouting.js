

//calculeaza dist intre 2 coord gps in metri
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371000;

  //dif de lat si lon in radiani
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
  //aplica formula pt a obtine "a" = cat de departe sunt pe glob
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  //transf a in distanta
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

//construieste bbox
export function bboxAroundPoints(start, end, paddingMeters) {
  const minLat = Math.min(start.lat, end.lat);
  const maxLat = Math.max(start.lat, end.lat);
  const minLon = Math.min(start.lon, end.lon);
  const maxLon = Math.max(start.lon, end.lon);

  const midLat = (minLat + maxLat) / 2;
  const metersToLatDeg = (m) => m / 111320;
  const metersToLonDeg = (m) => m / (111320 * Math.cos((midLat * Math.PI) / 180) || 1);

  const padLat = metersToLatDeg(paddingMeters);
  const padLon = metersToLonDeg(paddingMeters);

  //mareste dreptunghiul in toate directiile cu padding-ul.
  return {
    minLat: minLat - padLat,
    minLon: minLon - padLon,
    maxLat: maxLat + padLat,
    maxLon: maxLon + padLon,
  };
}

function isTruthyOneway(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

function isReverseOneway(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "-1" || normalized === "reverse";
}

//descarca drumurile OpenStreetMap din bbox si le transforma intr-un graf
export async function fetchOsmRoadGraph(bbox, options = {}) {
  const {
    timeoutSec = 25,
    endpoint = "https://overpass-api.de/api/interpreter",
    highwayRegex = "^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road|path|footway|pedestrian|cycleway)$",
  } = options;

  const query = `
[out:json][timeout:${timeoutSec}];
(
  way["highway"~"${highwayRegex}"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
);
(._;>;);
out body;`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const nodes = new Map();
  const ways = [];

  for (const element of data.elements || []) {
    if (element.type === "node") {
      nodes.set(element.id, { lat: element.lat, lon: element.lon });
    } else if (element.type === "way") {
      ways.push(element);
    }
  }

  const adjacency = new Map();
  const ensureAdj = (nodeId) => {
    if (!adjacency.has(nodeId)) adjacency.set(nodeId, []);
    return adjacency.get(nodeId);
  };

  for (const way of ways) {
    const nodeIds = way.nodes || [];
    if (nodeIds.length < 2) continue;

    const tags = way.tags || {};
    const oneway = tags.oneway;
    const isOneway = isTruthyOneway(oneway) || tags.junction === "roundabout";
    const isReverse = isReverseOneway(oneway);

    const addDirectedEdge = (fromId, toId) => {
      const from = nodes.get(fromId);
      const to = nodes.get(toId);
      if (!from || !to) return;
      ensureAdj(fromId).push({
        to: toId,
        weight: haversineMeters(from.lat, from.lon, to.lat, to.lon),
      });
    };

    for (let i = 0; i < nodeIds.length - 1; i += 1) {
      const a = nodeIds[i];
      const b = nodeIds[i + 1];

      if (isReverse) {
        addDirectedEdge(b, a);
        continue;
      }

      addDirectedEdge(a, b);
      if (!isOneway) addDirectedEdge(b, a);
    }
  }

  return { nodes, adjacency };
}


//gaseste cel mai apropiat nod de punctul GPS
export function nearestNodeId(nodes, lat, lon) {
  let bestId = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const [id, node] of nodes.entries()) {
    const d = haversineMeters(lat, lon, node.lat, node.lon);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }

  return bestId;
}

//gaseste cel mai apropiat punct turistic din lista
export function findNearestAttraction(userLat, userLon, points) {
  if (!points || points.length === 0) return null;

  let bestPoint = null;
  let bestDist = Number.POSITIVE_INFINITY;

  points.forEach((point) => {
    if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') return;

    const d = haversineMeters(userLat, userLon, point.lat, point.lon);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = point;
    }
  });

  return bestPoint;
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.#bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    if (this.items.length === 1) return this.items.pop();

    const top = this.items[0];
    this.items[0] = this.items.pop();
    this.#bubbleDown(0);
    return top;
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= this.items[index].priority) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  #bubbleDown(index) {
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (left < length && this.items[left].priority < this.items[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.items[right].priority < this.items[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;

      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}

//gaseste ruta cea mai scurta pe graf intre startId si goalId.
export function aStarShortestPath(graph, startId, goalId) {
  if (startId == null || goalId == null) return null;
  if (startId === goalId) return [startId];


  //extrage noduri si vecini 
  const { nodes, adjacency } = graph;
  const goalNode = nodes.get(goalId);
  if (!goalNode) return null;

  //distanta de la nod curent la dest
  const heuristic = (nodeId) => {
    const n = nodes.get(nodeId);
    if (!n) return Number.POSITIVE_INFINITY;
    return haversineMeters(n.lat, n.lon, goalNode.lat, goalNode.lon);
  };

  //lista de candidati ordonata dupa prioritate 
  const open = new MinHeap();
  open.push({ id: startId, priority: heuristic(startId) });

  //parintele
  const cameFrom = new Map();
  //costul real de la start pana la acel nod 
  const gScore = new Map([[startId, 0]]);
  //noduri finalizate
  const closed = new Set();

  while (open.size() > 0) {

    const current = open.pop();
    if (!current) break;
    //ia candidatul cel mai bun
    const currentId = current.id;

    //daca e deja procesat skip 
    if (closed.has(currentId)) continue;

    //daca am ajuns la dest reconstruim ruta
    if (currentId === goalId) {
      const path = [currentId];
      let cur = currentId;
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur);
        path.push(cur);
      }
      path.reverse();
      return path;
    }

    //marcheaza nod
    closed.add(currentId);

    //exploreaza vecini
    const neighbors = adjacency.get(currentId) || [];
    for (const { to, weight } of neighbors) {
      if (closed.has(to)) continue;

       //costul daca mergi spre to pe aici: 
      // cost pana la current + distanta segmentului (weight)
      const tentativeG = (gScore.get(currentId) ?? Number.POSITIVE_INFINITY) + weight;

      //update daca e mai buna
      if (tentativeG < (gScore.get(to) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(to, currentId);
        gScore.set(to, tentativeG);
        open.push({ id: to, priority: tentativeG + heuristic(to) });
      }
    }
  }

  return null;
}

//transforma lista de ID-uri din A* in coordonate lat/lon.
export function pathToLatLon(nodes, pathIds) {
  return (pathIds || [])
    .map((id) => nodes.get(id))
    .filter(Boolean)
    .map((n) => ({ lat: n.lat, lon: n.lon }));
}

export async function getSectorFromCoordinates(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "StreetArtView-StudentProject/1.0"
      }
    });

    if (!response.ok) return "Necunoscut";

    const data = await response.json();
    
    if (data.display_name) {
       const sectorMatch = data.display_name.match(/Sector [1-6]/);
       if (sectorMatch) {
         return sectorMatch[0];
       }
    }

    if (data.address && data.address.postcode) {
      const zip = data.address.postcode.toString().trim();
      if (zip.length === 6 && zip.startsWith("0")) {
        const sectorDigit = zip.charAt(1);
        if (["1", "2", "3", "4", "5", "6"].includes(sectorDigit)) {
          return `Sector ${sectorDigit}`;
        }
      }
    }

    if (data.address && data.address.city_district) {
      if (data.address.city_district.includes("Sector")) {
        return data.address.city_district;
      }
    }

    return "Bucharest";
  } catch (error) {
    console.error("Error geocoding:", error);
    return "Unknown";
  }
}

