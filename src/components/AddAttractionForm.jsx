import React from "react";

const AddAttractionForm = ({
  showForm,
  formData,
  onChange,
  onSave,
  onCancel,
  uploading,
  btnStyle,
  formInputStyle,
  onFileSelect
}) => {
  if (!showForm) return null;

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "white", padding: "20px", borderRadius: "12px", width: "320px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 100 }}>
      <h3 style={{ marginTop: 0, color: "#333" }}>New</h3>
      <label style={{ fontSize: "12px", color: "#666" }}>Title</label>
      <input type="text" style={formInputStyle} value={formData.title} onChange={(e) => onChange({ ...formData, title: e.target.value })} />
      <label style={{ fontSize: "12px", color: "#666" }}>Category</label>
      <select style={formInputStyle} value={formData.category} onChange={(e) => onChange({ ...formData, category: e.target.value })}>
        <option value="Graffiti">Graffiti</option>
        <option value="Mural">Mural</option>
        <option value="Sticker">Sticker</option>
        <option value="Tag">Tag</option>
      </select>
      <label style={{ fontSize: "12px", color: "#666" }}>Description</label>
      <textarea rows="2" style={formInputStyle} value={formData.description} onChange={(e) => onChange({ ...formData, description: e.target.value })} />
      <label style={{ fontSize: "12px", color: "#666" }}>Photos (one or more)</label>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button type="button" onClick={onFileSelect} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", background: "#f7f7f7", cursor: "pointer" }}>Add photos</button>
        <span style={{ fontSize: "12px", color: "#555" }}>{formData.imageFiles?.length || 0} selected</span>
      </div>
      {formData.imageFiles?.length > 0 && (
        <ul style={{ margin: "6px 0 0 0", paddingLeft: "16px", maxHeight: "80px", overflowY: "auto", fontSize: "12px", color: "#555" }}>
          {formData.imageFiles.map((f, idx) => <li key={idx}>{f.name}</li>)}
        </ul>
      )}
      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button onClick={onSave} disabled={uploading} style={{ ...btnStyle, backgroundColor: "#9C3A32", flex: 1, justifyContent: "center" }}>{uploading ? "..." : "Save"}</button>
        <button onClick={onCancel} disabled={uploading} style={{ ...btnStyle, backgroundColor: "#6c757d", flex: 1, justifyContent: "center" }}>Cancel</button>
      </div>
    </div>
  );
};

export default AddAttractionForm;
