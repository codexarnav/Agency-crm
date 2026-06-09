// Brand Assets Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Modal, FormInput,
  Avatar, StatusBadge,
} from "../shared/components";
import {
  getBrandAssets,
  createBrandAsset,
  updateBrandAsset
} from "../services/api";

// BrandAssetModal
function BrandAssetModal({ open, onClose, clientId, clientName, initial, onSave }) {
  const blank = BRAND_ASSET_FIELDS.reduce((a, f) => ({ ...a, [f.key]: "" }), {});
  const [form, setForm] = useState({ ...blank, ...initial });
  useEffect(() => { setForm({ ...blank, ...initial }); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={`Brand Assets - ${clientName}`} size="lg"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => onSave(form)}>Save Brand Assets</Btn></>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {BRAND_ASSET_FIELDS.map(f => (
          <div key={f.key} className="form-group" style={f.isTextarea ? { gridColumn: "1 / -1" } : {}}>
            <label className="form-label">{f.label}</label>
            {f.isTextarea
              ? <textarea className="form-input" value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={2} />
              : <input className="form-input" value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            }
          </div>
        ))}
      </div>
    </Modal>
  );
}


function BrandAssetsPage() {
  const { clients, session, showToast } = useApp();
  const role = session?.role || "employee";
  const canEdit = ["superadmin", "manager", "accountmanager"].includes(role);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selClient, setSelClient] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (clients.length > 0 && !selClient) {
      setSelClient(clients[0].id);
    }
  }, [clients, selClient]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await getBrandAssets();
      const list = (res.assets || res.data || []).map(a => ({
        ...a,
        logoUrl: a.clientLogo,
        brandColors: a.brandColor,
        toneOfVoice: a.tone,
        contentGuidelines: a.guidelines,
        driveFolderUrl: a.driveLink,
        canvaFolderUrl: a.canvaLink,
        previousCreatives: a.creativeLink,
        competitorRefs: a.competitorReference,
      }));
      setAssets(list);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch brand assets.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const visibleClients = role === "accountmanager"
    ? clients.filter(c => c.assignedAM === session?.id || c.assignedAM === "user_mgr1")
    : role === "client"
      ? clients.filter(c => c.id === "client_1")
      : clients;

  const filteredClients = visibleClients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const getAsset = (clientId) => assets.find(a => a.clientId === clientId);

  const handleSave = async (form) => {
    const existing = getAsset(selClient);
    try {
      const payload = {
        clientId: selClient,
        ...form
      };
      if (existing) {
        await updateBrandAsset(selClient, payload);
      } else {
        await createBrandAsset(payload);
      }
      await fetchAssets();
      showToast("Brand assets saved.", "success");
      setModalOpen(false);
    } catch (err) {
      showToast(err.message || "Failed to save brand assets.", "danger");
    }
  };

  const asset = getAsset(selClient);
  const selectedClient = clients.find(c => c.id === selClient);

  const linkFields = ["logoUrl", "driveFolderUrl", "canvaFolderUrl", "previousCreatives", "competitorRefs", "referenceLinks"];
  const displayFields = BRAND_ASSET_FIELDS.filter(f => !linkFields.includes(f.key));
  const assetLinkFields = BRAND_ASSET_FIELDS.filter(f => linkFields.includes(f.key));

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Brand Assets</h1>
          <p className="page-subtitle">Brand guidelines and assets for each client.</p>
        </div>
        {canEdit && selClient && (
          <Btn icon={<SvgIcon name="pen" size={13} color="#fff" />} onClick={() => setModalOpen(true)}>
            {asset ? "Edit Assets" : "Add Assets"}
          </Btn>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
        {/* Client list */}
        <div className="card" style={{ overflow: "hidden", height: "fit-content" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search clients..." />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 500 }}>
            {filteredClients.map(c => {
              const hasAsset = !!getAsset(c.id);
              return (
                <div key={c.id} onClick={() => setSelClient(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: selClient === c.id ? "var(--light-orange)" : "transparent", borderBottom: "1px solid #F3F4F6", borderLeft: selClient === c.id ? "3px solid var(--primary)" : "3px solid transparent", transition: "all 0.12s" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: (c.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: c.brandColor || "var(--primary)", flexShrink: 0 }}>{c.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: hasAsset ? "var(--success)" : "var(--muted)", fontWeight: 600 }}>{hasAsset ? "Assets saved" : "No assets"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asset viewer */}
        <div>
          {!asset ? (
            <div className="card">
              <EmptyState icon={<SvgIcon name="image" size={28} color="var(--muted)" />} title="No brand assets yet" desc={canEdit ? "Click 'Add Assets' to add brand guidelines for this client." : "Brand assets haven't been added for this client yet."} action={canEdit ? <Btn onClick={() => setModalOpen(true)}>Add Brand Assets</Btn> : null} />
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="card" style={{ padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
                {asset.logoUrl ? (
                  <img src={asset.logoUrl} alt="logo" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "contain", border: "1px solid var(--border)" }} onError={e => e.target.style.display = "none"} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: (selectedClient?.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: selectedClient?.brandColor || "var(--primary)" }}>{selectedClient?.name?.charAt(0)}</div>
                )}
                <div>
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17 }}>{selectedClient?.name}</h2>
                  <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{selectedClient?.industry}</p>
                </div>
                {asset.brandColors && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {asset.brandColors.split(",").slice(0, 5).map((c, i) => (
                      <div key={i} title={c.trim()} style={{ width: 28, height: 28, borderRadius: 6, background: c.trim(), border: "2px solid var(--border)", cursor: "help" }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-2" style={{ gap: 16 }}>
                {/* Text fields */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13.5, marginBottom: 14, color: "var(--dark)" }}>Brand Identity</p>
                  {displayFields.slice(0, 5).map(f => asset[f.key] && (
                    <div key={f.key} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F4F6" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{f.label}</div>
                      <div style={{ fontSize: 13.5, color: "var(--dark)", lineHeight: 1.55 }}>{asset[f.key]}</div>
                    </div>
                  ))}
                </div>

                {/* Guidelines */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13.5, marginBottom: 14, color: "var(--dark)" }}>Guidelines</p>
                  {displayFields.slice(5).map(f => asset[f.key] && (
                    <div key={f.key} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F4F6" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{f.label}</div>
                      <div style={{ fontSize: 13, color: "var(--dark)", lineHeight: 1.65 }}>{asset[f.key]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              {assetLinkFields.some(f => asset[f.key]) && (
                <div className="card" style={{ padding: "16px 20px", marginTop: 16 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>Resource Links</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {assetLinkFields.map(f => asset[f.key] && (
                      <a key={f.key} href={asset[f.key]} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--light-orange)", textDecoration: "none", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                        <SvgIcon name="arrowRight" size={14} color="var(--primary)" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)" }}>{f.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BrandAssetModal open={modalOpen} onClose={() => setModalOpen(false)} clientId={selClient} clientName={selectedClient?.name || ""} initial={asset || {}} onSave={handleSave} />
    </div>
  );
}

export const BRAND_ASSET_FIELDS = [
  { key: "logoUrl", label: "Client Logo URL", placeholder: "https://..." },
  { key: "brandColors", label: "Brand Colors", placeholder: "#FF6A00, #151515, #FFFFFF" },
  { key: "fonts", label: "Fonts", placeholder: "Plus Jakarta Sans, DM Sans" },
  { key: "toneOfVoice", label: "Tone of Voice", placeholder: "Professional, Friendly, Informative" },
  { key: "hashtags", label: "Hashtags", placeholder: "#BrandName #Industry #Campaign" },
  { key: "contentGuidelines", label: "Content Guidelines", placeholder: "Always use brand colors...", isTextarea: true },
  { key: "dosAndDonts", label: "Do's and Don'ts", placeholder: "Do: Use product images. Don't: Use competitor logos.", isTextarea: true },
  { key: "driveFolderUrl", label: "Drive Folder Link", placeholder: "https://drive.google.com/..." },
  { key: "canvaFolderUrl", label: "Canva Folder Link", placeholder: "https://canva.com/..." },
  { key: "previousCreatives", label: "Previous Creatives Link", placeholder: "https://..." },
  { key: "competitorRefs", label: "Competitor References", placeholder: "https://... competitor names" },
  { key: "referenceLinks", label: "Reference Links", placeholder: "https://..." },
  { key: "brandNotes", label: "Brand Notes", placeholder: "Any additional notes...", isTextarea: true },
];

export default BrandAssetsPage;

