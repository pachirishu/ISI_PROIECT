import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { auth, storage, db } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, Timestamp, deleteDoc, collection, onSnapshot, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  aStarShortestPath,
  bboxAroundPoints,
  fetchOsmRoadGraph,
  haversineMeters,
  nearestNodeId,
  findNearestAttraction,
  pathToLatLon,
  getSectorFromCoordinates
} from "../utils/osmRouting";
import AddAttractionForm from "./AddAttractionForm";
import AttractionDetails from "./AttractionDetails";

import plusIcon from "../assets/plus-104.png";
import imageCompression from "browser-image-compression";

// TOKEN HARDCODAT
const HARDCODED_TOKEN = "mzFcMRqhxzPAoRJavp2MJu4Ie_bLaayoSMVcjvcDYKKgP1xdMSL5dTMxs9Vf04Iw7lmf2hwI4gM4CHr2OlPnh8yHPWZoWzvpmSpkl0KUa23P6MsawvTyz5a7gdkjpZ8lKkM4EfEgF89hl20UhMa8CRRlYZJ8lOUrdePi8ZuDNGXsuLs1sNG38loMu8nv_bgy"; 
const LAYER_ID = "e6761e71a0754595bd9826b765e5ae05";

const MapComponent = () => {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const mapRef = useRef(null);
  
  // Ref-uri utilitare
  const esriRef = useRef(null);
  const graphicsLayerRef = useRef(null);
  const graffitiLayerRef = useRef(null);
  const featureLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const userGraphicRef = useRef(null);
  const destinationGraphicRef = useRef(null);
  const routeGraphicRef = useRef(null);
  
  // Stari Generale
  const [libLoaded, setLibLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenStatus, setTokenStatus] = useState("valid");

  const [user, setUser] = useState(null); 
  const [userFavorites, setUserFavorites] = useState([]); 

  // Stari Adaugare
  const [isAddMode, setIsAddMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tempPoint, setTempPoint] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Graffiti",
    description: "",
    imageFiles: []
  });

  // Stari Popup
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [creatorName, setCreatorName] = useState("");
  const [creatorAvatar, setCreatorAvatar] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [postMeta, setPostMeta] = useState({ likes: [], comments: [] });
  const [commentText, setCommentText] = useState("");
  const [favLoading, setFavLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState(null);
  const location = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // Stari Rutare
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeState, setRouteState] = useState({ status: "idle", message: "" });
  const [isRoutingPanelOpen, setIsRoutingPanelOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const didCenterRef = useRef(false);
  const watchIdRef = useRef(null);


  // 1. Auth & Favorite
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists() && userSnap.data().favorites) {
            setUserFavorites(userSnap.data().favorites);
          }
        } catch (err) {
          console.error("Eroare favorite:", err);
        }
      } else {
        setUserFavorites([]);
      }
    });
    return () => unsub();
  }, []);

  // 2. Load ArcGIS
  useEffect(() => {
    if (viewRef.current) return;

    const loadScript = () => {
      if (!document.getElementById("esri-css")) {
        const link = document.createElement("link");
        link.id = "esri-css";
        link.rel = "stylesheet";
        link.href = "https://js.arcgis.com/4.30/esri/themes/light/main.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("esri-js")) {
        const script = document.createElement("script");
        script.id = "esri-js";
        script.src = "https://js.arcgis.com/4.30/";
        script.async = true;
        
        script.onload = () => {
          setLibLoaded(true);
          setTimeout(() => initMap(), 100);
        };
        
        document.body.appendChild(script);
      } else {
        if (window.require) {
          setLibLoaded(true);
          initMap();
        }
      }
    };

    loadScript();
  }, []);

  // --- Helper Rutare ---
  function getLatLonFromGeometry(geometry) {
    const esri = esriRef.current;
    if (!esri || !geometry) return null;
    const geo = geometry.spatialReference?.wkid === 4326
      ? geometry
      : esri.webMercatorUtils.webMercatorToGeographic(geometry);
    const lat = geo.latitude ?? geo.y;
    const lon = geo.longitude ?? geo.x;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    return { lat, lon };
  }

  function setDestinationMarker(lat, lon, title) {
    const layer = graphicsLayerRef.current;
    const esri = esriRef.current;
    if (!layer || !esri) return;

    const geoPoint = new esri.Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } });
    const mapPoint = esri.webMercatorUtils.geographicToWebMercator(geoPoint);

    if (destinationGraphicRef.current) layer.remove(destinationGraphicRef.current);

    destinationGraphicRef.current = new esri.Graphic({
      geometry: mapPoint,
      symbol: {
        type: "simple-marker",
        style: "diamond",
        color: [255, 87, 34, 0.95],
        size: 12,
        outline: { color: [255, 255, 255, 1], width: 2 },
      },
      attributes: { kind: "destination", title },
    });

    layer.add(destinationGraphicRef.current);
  }

  // --- INIT MAP ---
  const initMap = () => {
    if (!window.require) return;

    window.require([
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/WebTileLayer",
      "esri/Basemap",
      "esri/layers/GraphicsLayer",
      "esri/layers/FeatureLayer",
      "esri/Graphic",
      "esri/geometry/Point",
      "esri/geometry/Polyline",
      "esri/geometry/support/webMercatorUtils",
      "esri/layers/support/Field"
    ], (Map, MapView, WebTileLayer, Basemap, GraphicsLayer, FeatureLayer, Graphic, Point, Polyline, webMercatorUtils, Field) => {

      if (viewRef.current) return;

      esriRef.current = { Graphic, Point, Polyline, webMercatorUtils, FeatureLayer, Field, GraphicsLayer };

      const osmLayer = new WebTileLayer({
        urlTemplate: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        title: "OpenStreetMap"
      });

      const customBasemap = new Basemap({
        baseLayers: [osmLayer],
        title: "Custom OSM",
        id: "osm-manual"
      });

      const map = new Map({
        basemap: customBasemap
      });
      mapRef.current = map;

      // Layer Rutare
      const graphicsLayer = new GraphicsLayer({ title: "Routing" });
      map.add(graphicsLayer);
      graphicsLayerRef.current = graphicsLayer;

      const markerLayer = new GraphicsLayer({ title: "Graffiti Images", listMode: "hide" });
      map.add(markerLayer);
      markerLayerRef.current = markerLayer;

      const view = new MapView({
        container: mapDiv.current,
        map: map,
        center: [26.10, 44.43],
        zoom: 12,
        constraints: { minZoom: 2 },
        popup: { autoOpenEnabled: false }
      });

      viewRef.current = view;

      // --- HANDLER CLICK PRINCIPAL ---
      view.on("click", async (event) => {
        // 1. Mod Adaugare
        if (view.container.style.cursor === "crosshair") {
           event.stopPropagation();
           setTempPoint(event.mapPoint);
           setShowForm(true);
           setIsAddMode(false);
           view.container.style.cursor = "default";
           return;
        }

        // 2. Mod Selectie / Rutare
        try {
          const response = await view.hitTest(event);
          const results = response.results;
          
          if (results.length > 0) {
             // Cautam doar in layer-ul de graffiti
            //  const graphic = results.find(r => r.graphic.layer === graffitiLayerRef.current)?.graphic;
            const graphicHit = results.find(r => r.graphic.layer === markerLayerRef.current || r.graphic.layer === featureLayerRef.current);
            const graphic = graphicHit ? graphicHit.graphic : null;
             
            if (graphic) {
               // A. ZOOM SI POPUP
               
               // Zoom pe atractie
              view.goTo({
                target: graphic.geometry,
                zoom: 16
              }, { duration: 800 });

              // Deschidere Popup
              setSelectedFeature(graphic);
              setCreatorName("Se incarca...");
              setCreatorAvatar("");

              // Cautare autor in Firebase
              const creatorId = graphic.attributes.createdBy;
               if (creatorId) {
                 try {
                   const userSnap = await getDoc(doc(db, "users", creatorId));
                   if (userSnap.exists()) {
                     setCreatorName(userSnap.data().username || "Unknown");
                     setCreatorAvatar(userSnap.data().avatarUrl || "");
                   } else {
                     setCreatorName("Unknown");
                     setCreatorAvatar("");
                   }
                 } catch (e) {
                   console.error("Author error:", e);
                   setCreatorName("Unknown");
                   setCreatorAvatar("");
                 }
               } else {
                 setCreatorName("Anonymous");
                 setCreatorAvatar("");
               }

               // B. SETARE DESTINATIE PENTRU RUTARE
               const pos = getLatLonFromGeometry(graphic.geometry);
               if (pos) {
                  const title = graphic.attributes.title || "Graffiti Point";
                  setDestination({ ...pos, title });
                  setRouteState({ status: "idle", message: `Selected for routing: ${title}` });
               }

             } else {
               setSelectedFeature(null);
               setPostMeta({ likes: [], comments: [] });
               setCommentText("");
               setCreatorAvatar("");
            }
         } else {
            setSelectedFeature(null);
            setPostMeta({ likes: [], comments: [] });
            setCommentText("");
          }
        } catch (e) {
          console.error("Click error:", e);
        }
      });

      setIsAuthenticated(true);

      const unsubscribe = onSnapshot(collection(db, "points"), (snapshot) => {
          updateMapLayers(snapshot.docs, map);
      });
    });
  };

  // 4. Adaugare Layer
 const updateMapLayers = async (docs, map) => {
    const { Graphic, FeatureLayer, Field, GraphicsLayer } = esriRef.current;
    
    const graphicsForFeatureLayer = [];
    const graphicsForMarkerLayer = [];

    const processPromises = docs.map(async (docSnap, index) => {
        const data = docSnap.data();
        
        // Geometry
        const point = {
            type: "point",
            longitude: parseFloat(data.lon),
            latitude: parseFloat(data.lat)
        };
        const attributes = {
            ObjectID: index + 1,
            firebaseId: docSnap.id,
            title: data.title || "No Title",
            category: data.category || "Graffiti",
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            createdBy: data.createdBy || ""
        };

        // 1. FeatureLayer Graphic (Date brute)
        const featGraphic = new Graphic({
            geometry: point,
            attributes: attributes
        });
        graphicsForFeatureLayer.push(featGraphic);

        // 2. GraphicsLayer Graphic (Poze)
        if (data.imageUrl) {
            try {
                const circularUrl = await createCircularMarker(data.imageUrl, 64, "#9C3A32", 3);
                if (circularUrl) {
                    const picGraphic = new Graphic({
                        geometry: point,
                        attributes: attributes,
                        symbol: {
                            type: "picture-marker",
                            url: circularUrl,
                            width: "48px", height: "48px"
                        }
                    });
                    graphicsForMarkerLayer.push(picGraphic);
                }
            } catch (e) { console.warn("Canvas err", e); }
        } else {
          const simpleGraphic = new Graphic({
                geometry: point,
                attributes: attributes,
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    color: [156, 58, 50, 0.9],
                    size: 10,
                    outline: { color: [255, 255, 255, 1], width: 1 }
                }
            });
            graphicsForMarkerLayer.push(simpleGraphic);
        }
    });

    await Promise.all(processPromises);

    // Reconstruim FeatureLayer (Client Side)
    if (featureLayerRef.current) {
        map.remove(featureLayerRef.current);
    }

    const featureLayer = new FeatureLayer({
        source: graphicsForFeatureLayer,
        objectIdField: "ObjectID",
        fields: [
            new Field({ name: "ObjectID", alias: "ObjectID", type: "oid" }),
            new Field({ name: "firebaseId", alias: "FirebaseID", type: "string" }),
            new Field({ name: "title", alias: "Title", type: "string" }),
            new Field({ name: "category", alias: "Category", type: "string" }),
            new Field({ name: "createdBy", alias: "Creator", type: "string" })
        ],
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-marker",
                size: 8,
                color: [150, 150, 150, 0.5],
                outline: { width: 0 }
            }
        },
        title: "Data Points",
        visible: false
    });

    map.add(featureLayer, 0);
    featureLayerRef.current = featureLayer;

    // Actualizam GraphicsLayer
    if (markerLayerRef.current) {
        markerLayerRef.current.removeAll();
        markerLayerRef.current.addMany(graphicsForMarkerLayer);

        setDataVersion(Date.now());
    }
  };

  // --- FUNCTII RUTARE ---
  const clearRoutingGraphics = ({ keepUser = true } = {}) => {
    const layer = graphicsLayerRef.current;
    if (!layer) return;
    if (!keepUser && userGraphicRef.current) layer.remove(userGraphicRef.current);
    if (destinationGraphicRef.current) layer.remove(destinationGraphicRef.current);
    if (routeGraphicRef.current) layer.remove(routeGraphicRef.current);
    if (!keepUser) userGraphicRef.current = null;
    destinationGraphicRef.current = null;
    routeGraphicRef.current = null;
  };

  const setUserMarker = (lat, lon) => {
    const layer = graphicsLayerRef.current;
    const esri = esriRef.current;
    if (!layer || !esri) return;
    const geoPoint = new esri.Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } });
    const mapPoint = esri.webMercatorUtils.geographicToWebMercator(geoPoint);
    if (userGraphicRef.current) layer.remove(userGraphicRef.current);
    userGraphicRef.current = new esri.Graphic({
      geometry: mapPoint,
      symbol: {
        type: "simple-marker", style: "circle", color: [33, 150, 243, 0.95], size: 12, outline: { color: [255, 255, 255, 1], width: 2 },
      },
      attributes: { kind: "user" },
    });
    layer.add(userGraphicRef.current);
  };

  const setRouteLine = (latLonPath) => {
    const view = viewRef.current;
    const layer = graphicsLayerRef.current;
    const esri = esriRef.current;
    if (!view || !layer || !esri) return;
    const points = latLonPath
      .map(({ lat, lon }) => new esri.Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } }))
      .map((p) => esri.webMercatorUtils.geographicToWebMercator(p));
    const path = points.map((p) => [p.x, p.y]);
    const polyline = new esri.Polyline({ paths: [path], spatialReference: view.spatialReference });
    if (routeGraphicRef.current) layer.remove(routeGraphicRef.current);
    routeGraphicRef.current = new esri.Graphic({
      geometry: polyline,
      symbol: { type: "simple-line", color: [0, 122, 255, 0.95], width: 4 },
      attributes: { kind: "route" },
    });
    layer.add(routeGraphicRef.current);
    view.goTo(polyline.extent.expand(1.2)).catch(() => {});
  };

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setRouteState({
        status: "error",
        message: "Browser does not support geolocation."
      });
      return;
    }

    setRouteState({
      status: "locating",
      message: "Obtaining GPS location..."
    });

    didCenterRef.current = false;

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        const next = { lat: latitude, lon: longitude };
        setUserLocation(next);
        setUserMarker(latitude, longitude);

        if (!didCenterRef.current) {
          viewRef.current?.goTo({
            center: [longitude, latitude],
            zoom: 16
          });
          didCenterRef.current = true;
        }

        setRouteState({
          status: "locating",
          message: `Initial GPS location ±${Math.round(accuracy)}m`
        });
      },
      (err) => {
        setRouteState({
          status: "error",
          message: `GPS error: ${err.message}`
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log("Coords:", latitude, longitude, "accuracy:", accuracy);

        if (accuracy > 1000 && didCenterRef.current) return;

        const next = { lat: latitude, lon: longitude };
        setUserLocation(next);
        setUserMarker(latitude, longitude);

        setRouteState({
          status: "done",
          message: `Current location ±${Math.round(accuracy)}m`
        });
      },
      (err) => {
        setRouteState({
          status: "error",
          message: `GPS error: ${err.message}`
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };

  const routeToDestination = async (start, end) => {
    setRouteState({ status: "routing", message: "Routing..." });
    const directDistance = haversineMeters(start.lat, start.lon, end.lat, end.lon);
    const padding = Math.max(600, directDistance * 0.35);
    const bbox = bboxAroundPoints(start, end, padding);
    const graph = await fetchOsmRoadGraph(bbox);
    const startNode = nearestNodeId(graph.nodes, start.lat, start.lon);
    const goalNode = nearestNodeId(graph.nodes, end.lat, end.lon);
    const pathIds = aStarShortestPath(graph, startNode, goalNode);
    if (!pathIds) throw new Error("No route found.");
    const path = pathToLatLon(graph.nodes, pathIds);
    const fullPath = [start, ...path, end];
    setRouteLine(fullPath);
    setRouteState({ status: "done", message: "Route displayed." });
  };

  const handleRoute = async () => {
    if (!userLocation) {
      setRouteState({ status: "error", message: "Find your location first." });
      return;
    }
    try {
      let target = destination;
      if (!target && markerLayerRef.current) {
        const graphics = markerLayerRef.current.graphics.toArray();

        const points = graphics.map((g) => {
          const coords = getLatLonFromGeometry(g.geometry);
          if (!coords) return null;
          return { ...coords, title: g.attributes.title || "Graffiti Point" };
        }).filter(Boolean);

        const nearest = findNearestAttraction(userLocation.lat, userLocation.lon, points);
        
        if (nearest) {
          target = nearest;
          setDestination(target);
          setRouteState({ status: "idle", message: `Routing to nearest: ${target.title}` });
        }
      }
      if (!target) {
        setRouteState({ status: "error", message: "No destination selected." });
        return;
      }

      setDestinationMarker(target.lat, target.lon, target.title);
      await routeToDestination(userLocation, target);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setRouteState({ status: "error", message });
    }
  };

  // --- CRUD (Save, Delete, Fav) ---
  const handleSavePoint = async () => {
    if (!user) { alert("Login required."); return; }
    if (!tempPoint) return;

    try {
      setUploading(true);
      setStatusMsg("Uploading...");
      
      const fileList = Array.from(formData.imageFiles || []);
      const uploadedUrls = [];
      for (const file of fileList) {
        const imageRef = ref(storage, `attractions/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(imageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }
      const imageUrl = uploadedUrls[0] || "";

      let detectedSector = "Unknown";
      const coords = getLatLonFromGeometry(tempPoint); 
      if (coords) {
         detectedSector = await getSectorFromCoordinates(coords.lat, coords.lon);
      }

      const docRef = await addDoc(collection(db, "points"), {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          imageUrl: imageUrl,
          createdBy: user.uid,
          lat: coords.lat,
          lon: coords.lon,
          sector: detectedSector || "Unknown",
          createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, "attractionMeta", docRef.id), {
        title: formData.title,
        category: formData.category,
        createdBy: user.uid,
        imageUrl,
        imageUrls: uploadedUrls,
        likes: [],
        comments: [],
        sector: detectedSector
      }, { merge: true });

      setStatusMsg("Saved!");
      setShowForm(false);
      setFormData({ title: "", category: "Graffiti", description: "", imageFiles: [] });
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload error.");
    } finally {
      setUploading(false);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const handleDeleteFeature = async () => {
    if (!selectedFeature || !user) return;
    
    if (selectedFeature.attributes.createdBy !== user.uid) { 
        alert("You cannot delete this."); return; 
    }

    if (confirm("Are you sure you want to delete?")) {
      const fbId = selectedFeature.attributes.firebaseId;

      if (fbId) {
          try {
             await deleteDoc(doc(db, "points", fbId));
             await deleteDoc(doc(db, "attractionMeta", fbId));

             const userRef = doc(db, "users", user.uid);
             await updateDoc(userRef, {
                 favorites: arrayRemove(fbId)
             });
             
             setUserFavorites(prev => prev.filter(id => id !== fbId));
             setSelectedFeature(null);
             setStatusMsg("Deleted.");
             setTimeout(() => setStatusMsg(""), 3000);
          } catch (e) {
              console.error("Delete err:", e);
              alert("Error deleting.");
          }
      } else {
          alert("Error: No ID found for this point.");
      }
    }
  };

  const handleConnect = () => {};

  const handleIFeelLucky = async () => {
    if (!markerLayerRef.current) return;
    
    const allGraphics = markerLayerRef.current.graphics.toArray();
    
    const candidates = allGraphics.filter(g => {
        const creatorId = g.attributes.createdBy;
        if (!user) return true; 
        return creatorId !== user.uid;
    });

    if (candidates.length === 0) {
      alert("No valid destination found (that is not posted by you).");
      return;
    }

    const randomGraphic = candidates[Math.floor(Math.random() * candidates.length)];
    const title = randomGraphic.attributes.title || "Surprise Destination";

    setStatusMsg(`Lucky pick: ${title}`);
    setTimeout(() => setStatusMsg(""), 5000);
    
    if (viewRef.current) {
        viewRef.current.goTo({ target: randomGraphic.geometry, zoom: 16 }, { duration: 1000 });
    }

    setSelectedFeature(randomGraphic);

    setCreatorName("Loading...");
    setCreatorAvatar("");
    
    const creatorId = randomGraphic.attributes.createdBy;
    if (creatorId) {
        try {
            const userSnap = await getDoc(doc(db, "users", creatorId));
            if (userSnap.exists()) {
                setCreatorName(userSnap.data().username || "Unknown");
                setCreatorAvatar(userSnap.data().avatarUrl || "");
            } else {
                setCreatorName("Unknown");
            }
        } catch (e) {
            console.error("Error loading lucky creator:", e);
            setCreatorName("Unknown");
        }
    } else {
        setCreatorName("Anonymous");
    }

    const pos = getLatLonFromGeometry(randomGraphic.geometry);
    if (pos) {
        setDestination({ ...pos, title });
        setDestinationMarker(pos.lat, pos.lon, title);
        setRouteState({ status: "idle", message: `Selected: ${title}` });
    }
  };

  const toggleAddMode = () => {
     if (!viewRef.current) return;
     if (isAddMode) {
        setIsAddMode(false);
        viewRef.current.container.style.cursor = "default";
        setStatusMsg("");
     } else {
        setIsAddMode(true);
        viewRef.current.container.style.cursor = "crosshair";
        setStatusMsg("Click on the map.");
        setTimeout(() => {setStatusMsg("");}, 4000);
     }
  };

  const getFeatureId = (feature) => feature?.attributes?.firebaseId || (feature?.attributes?.OBJECTID ? feature.attributes.OBJECTID.toString() : null);

  useEffect(() => {
    const focusId = location.state?.focusObjectId;
    if (focusId) {
      setPendingFocusId(focusId.toString());
    }
  }, [location.state]);

  useEffect(() => {
    setShowImageModal(false);
  }, [selectedFeature]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    const view = viewRef.current;
    if (!pendingFocusId || !layer || !view) return;

    const all = layer.graphics.toArray();
    const graphic = all.find(g => {
        const attrs = g.attributes || {};
        if (attrs.firebaseId === pendingFocusId) return true;
        if (attrs.OBJECTID && attrs.OBJECTID.toString() === pendingFocusId) return true;
        return false;
    });
    if (graphic) {
        setSelectedFeature(graphic);
        view.goTo({ target: graphic.geometry, zoom: 16 }, { duration: 2000 });
        setCreatorName("Loading...");
        setCreatorAvatar("");

        const creatorId = graphic.attributes.createdBy;
        if (creatorId) {
            getDoc(doc(db, "users", creatorId))
              .then((userSnap) => {
                if (userSnap.exists()) {
                  setCreatorName(userSnap.data().username || "Unknown");
                  setCreatorAvatar(userSnap.data().avatarUrl || "");
                } else {
                  setCreatorName("Unknown");
                  setCreatorAvatar("");
                }
              })
              .catch((err) => {
                console.error("Error loading creator:", err);
                setCreatorName("Unknown");
                setCreatorAvatar("");
              });
        } else {
            setCreatorName("Anonymous");
            setCreatorAvatar("");
        }

        const pos = getLatLonFromGeometry(graphic.geometry);
        if (pos) {
          const title = graphic.attributes.title || "Graffiti Point";
          setDestination({ ...pos, title });
          setRouteState({ status: "idle", message: `Selected for routing: ${title}` });
        }
        setPendingFocusId(null);
  
        // return;
    }
  }, [pendingFocusId, isAuthenticated, libLoaded, dataVersion]);

  useEffect(() => {
  const loadMeta = async () => {
      const featureId = getFeatureId(selectedFeature);
      if (!featureId) {
        setPostMeta({ likes: [], comments: [], imageUrls: [] });
        setCommentText("");
        setCurrentImageIndex(0);
        return;
      }
      const baseMetaFromFeature = {
        title: selectedFeature?.attributes?.title || "",
        category: selectedFeature?.attributes?.category || "",
        imageUrl: selectedFeature?.attributes?.imageUrl || "",
        createdBy: selectedFeature?.attributes?.createdBy || ""
      };
      try {
        const snap = await getDoc(doc(db, "attractionMeta", featureId));
        if (snap.exists()) {
          const data = snap.data();
          if (!data.createdBy && baseMetaFromFeature.createdBy) {
            await setDoc(doc(db, "attractionMeta", featureId), { createdBy: baseMetaFromFeature.createdBy }, { merge: true });
          }
          setPostMeta({
            likes: data.likes || [],
            comments: data.comments || [],
            imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
          });
        } else {
          const attrUrl = baseMetaFromFeature.imageUrl;
          await setDoc(doc(db, "attractionMeta", featureId), { ...baseMetaFromFeature, imageUrls: attrUrl ? [attrUrl] : [], likes: [], comments: [] }, { merge: true });
          setPostMeta({ likes: [], comments: [], imageUrls: attrUrl ? [attrUrl] : [] });
        }
      } catch (err) {
        console.error("Error loading attraction meta:", err);
        const attrUrl = baseMetaFromFeature.imageUrl;
        setPostMeta({ likes: [], comments: [], imageUrls: attrUrl ? [attrUrl] : [] });
      }
      setCommentText("");
      setCurrentImageIndex(0);
    };
    loadMeta();
  }, [selectedFeature]);

  const handleToggleFavorite = async () => {
    if (!user || !selectedFeature) return;
    const featureId = getFeatureId(selectedFeature);
    if (!featureId) return;
    setFavLoading(true);
    const metaRef = doc(db, "attractionMeta", featureId);
    const alreadyFav = userFavorites.includes(featureId);
    const update = alreadyFav ? arrayRemove(user.uid) : arrayUnion(user.uid);
    const baseMeta = {
      title: selectedFeature.attributes.title || "",
      imageUrl: selectedFeature.attributes.imageUrl || "",
      category: selectedFeature.attributes.category || "",
      createdBy: selectedFeature.attributes.createdBy || ""
    };
    try {
      await setDoc(metaRef, { ...baseMeta }, { merge: true });
      await updateDoc(metaRef, { likes: update });
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { favorites: alreadyFav ? arrayRemove(featureId) : arrayUnion(featureId) });
      setUserFavorites((prev) => alreadyFav ? prev.filter((id) => id !== featureId) : [...prev, featureId]);
      setPostMeta((prev) => {
        const likesSet = new Set(prev.likes || []);
        if (alreadyFav) {
          likesSet.delete(user.uid);
        } else {
          likesSet.add(user.uid);
        }
        return { ...prev, likes: Array.from(likesSet) };
      });
    } catch (err) {
      console.error("Error favoriting:", err);
    } finally {
      setFavLoading(false);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!user || !selectedFeature) return;
    const text = commentText.trim();
    if (!text) return;
    const featureId = getFeatureId(selectedFeature);
    if (!featureId) return;
    setCommentLoading(true);
    const metaRef = doc(db, "attractionMeta", featureId);
    const baseMeta = {
      title: selectedFeature.attributes.title || "",
      imageUrl: selectedFeature.attributes.imageUrl || "",
      category: selectedFeature.attributes.category || "",
      createdBy: selectedFeature.attributes.createdBy || ""
    };
    const comment = {
      userId: user.uid,
      username: user.displayName || user.email || "Anonim",
      text,
      createdAt: Timestamp.now()
    };
    try {
      await setDoc(metaRef, { likes: [], ...baseMeta }, { merge: true });
      await updateDoc(metaRef, { comments: arrayUnion(comment) });
      const fresh = await getDoc(metaRef);
      if (fresh.exists()) {
        const data = fresh.data();
        setPostMeta({
          likes: data.likes || [],
          comments: data.comments || []
        });
      } else {
        setPostMeta((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), comment]
        }));
      }
      setCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = value.toDate
      ? value.toDate()
      : (value.seconds ? new Date(value.seconds * 1000) : new Date(value));
    return date.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
  };

  const toMillis = (value) => {
    if (!value) return 0;
    if (value.toMillis) return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    if (typeof value === "number") return value;
    const date = new Date(value);
    return date.getTime();
  };

  const commentsSorted = [...(postMeta.comments || [])].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const isFavorited = user ? userFavorites.includes(getFeatureId(selectedFeature)) : false;
  const favoritesCount = postMeta.likes?.length || 0;
  const imageList = (postMeta.imageUrls && postMeta.imageUrls.length > 0)
    ? postMeta.imageUrls
    : (selectedFeature?.attributes?.imageUrl ? [selectedFeature.attributes.imageUrl] : []);
  const safeIndex = imageList.length > 0 ? currentImageIndex % imageList.length : 0;
  const currentImage = imageList[safeIndex];

  // Stiluri UI
  const btnStyle = { padding: "10px 16px", backgroundColor: isAddMode ? "#dc3545" : "#28a745", color: "white", border: "none", borderRadius: "30px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "8px" };
  const formInputStyle = { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "4px", border: "1px solid #ccc", maxWidth: "-webkit-fill-available"};
  const MAX_FILE_SIZE_MB = 5;
  const MAX_IMAGES = 5;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true
    };

    return await imageCompression(file, options);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validImages = [];
    const errors = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not an allowed image type`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name} is larger than ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true
        });

        validImages.push(compressed);
      } catch (err) {
        console.error("Compression failed:", err);
        errors.push(`${file.name} could not be processed`);
      }
    }

    if (errors.length) {
      alert(errors.join("\n"));
    }

    setFormData((prev) => {
      const existing = prev.imageFiles || [];
      const combined = [...existing, ...validImages];

      if (combined.length > MAX_IMAGES) {
        alert(`Maximum ${MAX_IMAGES} images allowed`);
        return prev;
      }

      return {
        ...prev,
        imageFiles: combined
      };
    });

    event.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div className="map-view" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#e0e0e0" }} ref={mapDiv}></div>

      {statusMsg && <div style={{ position: "absolute", bottom: "95px", right: "25px", backgroundColor: "rgba(0,0,0,0.8)", color: "white", padding: "8px 12px", borderRadius: "4px", fontSize: "13px", zIndex: 90 }}>{statusMsg}</div>}

      {tokenStatus === "valid" && user && !showForm && !selectedFeature && (
          <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 90 }}>
            <button onClick={toggleAddMode} style={{ background: "#F8F1DC", border: "1px solid #ddd", borderRadius: "50%", padding: "10px", width: "56px", height: "56px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
              <img src={plusIcon} alt="add" style={{ width: "24px", height: "24px" }} />
            </button>
          </div>
      )}

      <AddAttractionForm
        showForm={showForm}
        formData={formData}
        onChange={setFormData}
        onSave={handleSavePoint}
        onCancel={() => setShowForm(false)}
        uploading={uploading}
        btnStyle={btnStyle}
        formInputStyle={formInputStyle}
        onFileSelect={triggerFileSelect}
      />
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileSelect} />

      {selectedFeature && (
        <AttractionDetails
          feature={selectedFeature}
          creatorName={creatorName}
          creatorAvatar={creatorAvatar}
          description={selectedFeature.attributes.description}
          onDelete={handleDeleteFeature}
          user={user}
          isFavorited={isFavorited}
          favoritesCount={favoritesCount}
          favLoading={favLoading}
          onToggleFavorite={handleToggleFavorite}
          notAuthText="Authenticate to favorite"
          commentsSorted={commentsSorted}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onCommentSubmit={addComment}
          commentLoading={commentLoading}
          formatDate={formatDate}
          imageList={imageList}
          safeIndex={safeIndex}
          currentImage={currentImage}
          onPrevImage={() => setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length)}
          onNextImage={() => setCurrentImageIndex((prev) => (prev + 1) % imageList.length)}
          showImageModal={showImageModal}
          setShowImageModal={setShowImageModal}
          onClosePanel={() => { setSelectedFeature(null); setPostMeta({ likes: [], comments: [] }); }}
        />
      )}

      {libLoaded && tokenStatus === "valid" && (
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 90 }}>
          <button 
            onClick={handleIFeelLucky}
            style={{
              background: "rgb(248, 241, 220)",
              border: "2px solid #fff",
              borderRadius: "25px",
              padding: "10px 20px",
              color: "#555",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🎲 I feel lucky
          </button>
        </div>
      )}

      {libLoaded && isAuthenticated && (
        <>
          {!isRoutingPanelOpen && (
            <button
              onClick={() => setIsRoutingPanelOpen(true)}
              style={{
                position: "absolute",
                bottom: "30px",
                left: "20px",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#9C3A32",
                color: "#fff",
                border: "none",
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                cursor: "pointer",
                zIndex: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                transition: "transform 0.2s, background-color 0.2s"
              }}
              title="Open Routing"
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.backgroundColor = "#B94A40";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "#9C3A32";
              }}
            >
              ➤
            </button>
          )}

          {isRoutingPanelOpen && (
            <div 
              style={{ 
                position: "absolute", 
                bottom: "30px", 
                left: "20px", 
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "20px", 
                borderRadius: "24px",
                boxShadow: "0 12px 32px rgba(156, 58, 50, 0.2)",
                zIndex: 99, 
                width: "300px",
                border: "1px solid rgba(255,255,255,0.8)",
                animation: "fadeIn 0.2s ease-out"
              }}
            >
              <button
                onClick={() => setIsRoutingPanelOpen(false)}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  color: "#8b7b72",
                  fontSize: "18px",
                  cursor: "pointer",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", marginBottom: "16px", borderBottom: "2px solid #F8F1DC", paddingBottom: "10px", paddingRight: "20px" }}>
                 <h3 style={{ margin: 0, color: "#9C3A32", fontFamily: "Gladolia, system-ui, sans-serif", fontSize: "22px", letterSpacing: "0.5px" }}>
                   Plan Route
                 </h3>
              </div>

              <div style={{ fontSize: "14px", color: "#5F4135", marginBottom: "16px", fontFamily: '"Inter", sans-serif', lineHeight: "1.4" }}>
                {destination?.title ? (
                  <div style={{ background: "#F8F1DC", padding: "8px 12px", borderRadius: "12px" }}>
                    <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", color: "#9C3A32", fontWeight: "bold", marginBottom: "2px" }}>
                      To:
                    </span>
                    <strong style={{ fontSize: "15px", color: "#3d2a24" }}>{destination.title}</strong>
                  </div>
                ) : (
                  <div style={{ color: "#8b7b72", fontStyle: "italic" }}>
                    Select a graffiti on the map.
                  </div>
                )}
                
                {routeState.message && (
                   <div style={{ marginTop: "8px", fontSize: "12px", color: routeState.status === "error" ? "#d32f2f" : "#6a5a52" }}>
                     {routeState.status === "locating"}
                     {routeState.status === "routing"}
                     {routeState.message}
                   </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button 
                  onClick={requestUserLocation} 
                  disabled={routeState.status === "locating"}
                  style={{ 
                    width: "100%", padding: "12px", backgroundColor: "#5F4135", color: "#F8F1DC", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "600", fontSize: "14px", opacity: routeState.status === "locating" ? 0.7 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}
                >
                  Locate Me
                </button>

                <button 
                  onClick={handleRoute} 
                  disabled={routeState.status === "routing"}
                  style={{ 
                    width: "100%", padding: "12px", backgroundColor: "#9C3A32", color: "white", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "600", fontSize: "14px", opacity: routeState.status === "routing" ? 0.7 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}
                >
                 Show Route
                </button>

                <button 
                  onClick={() => { clearRoutingGraphics(); setDestination(null); setRouteState({ status: "idle", message: "Route cleared." }); }} 
                  style={{ 
                    width: "100%", padding: "10px", backgroundColor: "transparent", color: "#8b7b72", border: "2px solid #eadfda", borderRadius: "14px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "4px", transition: "all 0.2s"
                  }}
                >
                  Reset
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {libLoaded && tokenStatus !== "valid" && tokenStatus !== "checking" && (
        <div style={{ position: "absolute", top: "20px", right: "20px", backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 99, width: "300px" }}>
          <h3 style={{ marginTop: 0, color: "#d32f2f" }}>Demo Mode</h3>
          <p style={{ fontSize: "14px", color: "#555" }}>Token expired.</p>
          <button onClick={handleConnect} style={{...btnStyle, backgroundColor: "#0079c1", width: "100%", justifyContent: "center"}}>Regenerate Token</button>
        </div>
      )}
    </div>
  );
};

const createCircularMarker = (url, size = 64, borderColor = "#d32f2f", borderWidth = 3) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.save();
      ctx.clip();

      const aspect = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;

      if (aspect > 1) {
        drawHeight = size;
        drawWidth = size * aspect;
        offsetX = -(drawWidth - size) / 2;
      } else {
        drawWidth = size;
        drawHeight = size / aspect;
        offsetY = -(drawHeight - size) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      ctx.beginPath();
      const radius = (size / 2) - (borderWidth / 2); 
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();

      resolve(canvas.toDataURL());
    };

    img.onerror = () => {
      resolve(null);
    };
  });
};

export default MapComponent;
