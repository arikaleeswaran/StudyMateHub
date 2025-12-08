import React from 'react';

function KnowledgeCheckModal({ nodeLabel, onYes, onNo }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🤔</div>
        
        <h2 className="modal-title">Quick Check</h2>
        
        <p className="modal-text">
          Have you studied <strong>{nodeLabel}</strong> before?
        </p>
        
        <div className="btn-group">
          <button className="btn-yes" onClick={onYes}>
            Yes, I know it
          </button>
          <button className="btn-no" onClick={onNo}>
            No, I'm new
          </button>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeCheckModal;