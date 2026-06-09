import React, { Component } from "react";
import AgencyCRM from "./AgencyCRM";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", textAlign: "left", background: "#FFF5F5", color: "#C53030", minHeight: "100vh", boxSizing: "border-box" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: "bold" }}>Application Error Detected</h2>
          <p style={{ fontWeight: "bold", fontSize: 16, marginBottom: 15 }}>{this.state.error?.toString()}</p>
          <pre style={{ background: "#FFE3E3", padding: 20, borderRadius: 8, overflowX: "auto", fontSize: 13, color: "#9B2C2C", lineHeight: 1.5 }}>
            {this.state.error?.stack}
          </pre>
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 20px", background: "#4A5568", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
            >
              Reload Page
            </button>
            <button
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
              style={{ padding: "10px 20px", background: "#C53030", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
            >
              Reset App Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AgencyCRM />
    </ErrorBoundary>
  );
}

export default App;