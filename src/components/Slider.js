import React, { useEffect, useState } from 'react';

function Slider({ label, options, onChange, disabled, value, disabledOptions = [] }) {
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
    const opt = options[index];
    const isIndividuallyDisabled = disabledOptions.includes(opt);
    if (disabled || isIndividuallyDisabled || index === selectedIndex) return;
    setSelectedIndex(index);
    onChange(opt);
  };

  // Tooltip messages for disabled buttons
  const getTooltip = (opt) => {
    if (opt === 'Navigate' && disabledOptions.includes('Navigate')) {
      return 'Please dock the robot to switch to Navigate mode';
    }
    if (opt === 'Map' && disabledOptions.includes('Map')) {
      return 'Please dock the robot to switch to Map mode';
    }
    return '';
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
          const isIndividuallyDisabled = disabledOptions.includes(opt);
          const isButtonDisabled = disabled || isIndividuallyDisabled;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isButtonDisabled}
              title={getTooltip(opt)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isSelected ? '#2196F3' : '#e0e0e0',
                color: isSelected ? 'white' : '#333',
                opacity: isButtonDisabled ? 0.6 : 1,
                transition: 'all 0.2s ease-in-out',
                minWidth: '100px',
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
