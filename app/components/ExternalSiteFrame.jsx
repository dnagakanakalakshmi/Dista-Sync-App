// src/components/ExternalSiteFrame.jsx
import React from "react";

/**
 * ExternalSiteFrame component
 * @param {Object} props - Component props
 * @param {string} props.url - URL to load in the iframe
 */
export function ExternalSiteFrame({ url }) {
  
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh", // full height of the embedded app iframe
      }}
    >

      {/* The iframe that loads your website */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <iframe
          src={url}
          title="External website"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          // optional attributes
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}