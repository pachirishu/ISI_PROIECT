import React from "react";
import leftArrowImg from "../assets/32213s.png";
import rightArrowImg from "../assets/32213.png";

const AttractionDetails = ({
  feature,
  creatorName,
  creatorAvatar,
  description,
  onDelete,
  user,
  isFavorited,
  favoritesCount,
  favLoading,
  onToggleFavorite,
  notAuthText,
  commentsSorted,
  commentText,
  onCommentTextChange,
  onCommentSubmit,
  commentLoading,
  formatDate,
  imageList,
  safeIndex,
  currentImage,
  onPrevImage,
  onNextImage,
  showImageModal,
  setShowImageModal,
  onClosePanel
}) => {
  if (!feature) return null;

  return (
    <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "380px", maxWidth: "100%", backgroundColor: "white", boxShadow: "-12px 0 28px rgba(0,0,0,0.25)", zIndex: 110, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: '"InterMedium", "Inter", system-ui, sans-serif', fontSize: "16px", lineHeight: "1.55", letterSpacing: "0.6px" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f1f1" }}>
        <strong style={{ color: "#222", fontSize: "19px", fontFamily: "'Fragmentcore', 'Inter', system-ui, sans-serif", letterSpacing: "1.4px" }}>{feature.attributes.title || "Atractie"}</strong>
        <button
          onClick={onClosePanel}
          style={{
            background: "transparent",
            border: "none",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            fontSize: "18px",
            color: "#777",
            lineHeight: "1",
            marginTop: "-6px"
          }}
        >
          x
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ width: "100%", height: "260px", background: "linear-gradient(120deg, #f9f9f9, #e8eef5)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {currentImage ? (
            <img
              src={currentImage}
              alt="Atractie"
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              onClick={() => setShowImageModal(true)}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}>Fara imagine</div>
          )}
          {imageList.length > 1 && (
            <>
              <button
                onClick={onPrevImage}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "#fff", color: "#333", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(0,0,0,0.25)" }}
              >
                <img src={leftArrowImg} alt="prev" style={{ width: "16px", height: "16px" }} />
              </button>
              <button
                onClick={onNextImage}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "#fff", color: "#333", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(0,0,0,0.25)" }}
              >
                <img src={rightArrowImg} alt="next" style={{ width: "16px", height: "16px" }} />
              </button>
              <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                {imageList.map((_, idx) => (
                  <span key={idx} style={{ width: idx === safeIndex ? "10px" : "8px", height: idx === safeIndex ? "10px" : "8px", borderRadius: "50%", background: idx === safeIndex ? "white" : "rgba(255,255,255,0.6)", display: "inline-block", transition: "all 0.2s" }}></span>
                ))}
              </div>
            </>
          )}
          <span style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.65)", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
            {feature.attributes.category || "Categorie"}
          </span>
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #ddd" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0f0f0", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#555" }}>
                  {(creatorName || "A")[0]?.toUpperCase?.() || "A"}
                </div>
              )}
              <strong style={{ color: "#333" }}>{creatorName || "Anonim"}</strong>
            </div>
            {feature.attributes.createdBy === user?.uid && (
              <button
                onClick={onDelete}
                style={{
                  padding: "7px 12px",
                  background: "#C3463F",
                  color: "white",
                  border: "none",
                  borderRadius: "18px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
                }}
              >
                Delete
              </button>
            )}
          </div>

          <p style={{ margin: 0, color: "#444", lineHeight: 1.7, fontSize: "16px", letterSpacing: "0.6px" }}>
            {description || "Fara descriere."}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
            <button
              onClick={onToggleFavorite}
              disabled={favLoading || !user}
              style={{
                padding: "9px 16px",
                borderRadius: "18px",
                border: "none",
                cursor: user ? "pointer" : "not-allowed",
                background: isFavorited ? "#e8e8e8" : "#f0f0f0",
                color: "#555",
                fontWeight: "bold",
                letterSpacing: "0.8px",
                minWidth: "140px",
                opacity: favLoading ? 0.8 : 1
              }}
            >
              {favLoading ? "..." : (isFavorited ? "★ Favorites" : "☆ Favorites")}
            </button>
            <div style={{ marginLeft: "auto", color: "#666", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>{favoritesCount} FAVORITES</div>
            {!user && <div style={{ fontSize: "12px", color: "#888", marginLeft: "8px" }}>{notAuthText}</div>}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f1f1", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <strong style={{ color: "#222" }}>Comments</strong>
          <form onSubmit={onCommentSubmit} style={{ display: "flex", gap: "8px" }}>
            <input type="text" placeholder="Write a comment..." value={commentText} onChange={(e) => onCommentTextChange(e.target.value)} disabled={commentLoading} style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid #ddd", background: "#fafafa", fontFamily: '"InterMedium", "Inter", system-ui, sans-serif', letterSpacing: "0.8px" }} />
            <button
              type="submit"
              disabled={commentLoading || !commentText.trim()}
              style={{
                padding: "9px 14px",
                borderRadius: "18px",
                border: "none",
                background: "#586c6c",
                color: "white",
                fontWeight: "bold",
                fontFamily: '"InterMedium", "Inter", system-ui, sans-serif',
                cursor: "pointer",
                opacity: commentLoading || !commentText.trim() ? 0.7 : 1,
                letterSpacing: "1.2px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
              }}
            >
              {commentLoading ? "..." : "Post"}
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "260px", overflowY: "auto", paddingRight: "4px" }}>
            {commentsSorted.length === 0 && <div style={{ color: "#888", fontSize: "13px", letterSpacing: "0.6px" }}>Be the first to comment.</div>}
            {commentsSorted.map((c, idx) => (
              <div key={idx} style={{ padding: "10px", border: "1px solid #f0f0f0", borderRadius: "10px", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#333", letterSpacing: "0.6px" }}>{c.username || "Unknown"}</strong>
                  <span style={{ fontSize: "11px", color: "#888", letterSpacing: "0.6px" }}>{formatDate(c.createdAt)}</span>
                </div>
                <p style={{ margin: "6px 0 0 0", color: "#444", fontSize: "13px", lineHeight: 1.4, letterSpacing: "0.6px" }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showImageModal && (
        <div onClick={() => setShowImageModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 28px 32px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "88vw", maxHeight: "82vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={currentImage} alt="Atractie" style={{ maxWidth: "88vw", maxHeight: "82vh", objectFit: "contain", borderRadius: "6px", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }} />
            {imageList.length > 1 && (
              <>
                <button onClick={onPrevImage} style={{ position: "absolute", left: "-44px", top: "50%", transform: "translateY(-50%)", background: "#fff", color: "#333", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "50%", width: "42px", height: "42px", cursor: "pointer", fontSize: "0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                  <img src={leftArrowImg} alt="prev" style={{ width: "18px", height: "18px" }} />
                </button>
                <button onClick={onNextImage} style={{ position: "absolute", right: "-44px", top: "50%", transform: "translateY(-50%)", background: "#fff", color: "#333", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "50%", width: "42px", height: "42px", cursor: "pointer", fontSize: "0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                  <img src={rightArrowImg} alt="next" style={{ width: "18px", height: "18px" }} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttractionDetails;
