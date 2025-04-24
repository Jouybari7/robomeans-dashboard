import React, { useEffect, useState } from 'react';

function Slider({ label, options, onChange, disabled, value }) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = options.findIndex(
      (opt) => typeof value === 'string' && opt.toLowerCase() === value.toLowerCase()
    );
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const idx = options.findIndex(
      (opt) => typeof value === 'string' && opt.toLowerCase() === value.toLowerCase()
    );
    if (idx >= 0 && idx !== selectedIndex) {
      setSelectedIndex(idx);
    }
  }, [value, options, selectedIndex]);

  const handleSelect = (index) => {
    if (disabled || index === selectedIndex) return;
    setSelectedIndex(index);
    onChange(options[index]);
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>{label}</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {options.map((opt, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={disabled}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                backgroundColor: isSelected ? '#2196F3' : '#e0e0e0',
                color: isSelected ? 'white' : '#333',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.2s ease-in-out',
                minWidth: '100px', // 👈 Ensures all buttons have equal width
                textAlign: 'center',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Slider;
