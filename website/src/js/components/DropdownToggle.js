import React from 'react';

const DropdownToggle = ({ id, title, description, value, onClick }) => {

  const toggle_label = !!(value) ? 'On' : 'Off';

  function handleClick(e) {
    if ( typeof onClick === 'function' ) {
      onClick(e);
    }
  }

  return (
    <li className="dropdown__toggle">

      <div className="dropdown__toggle--section">
        <h5>{ title }</h5>
        <p>{ description }</p>
      </div>

      <div className="dropdown__toggle--section dropdown__toggle--button">
        <a onClick={handleClick} data-id={id} data-value={value}>
          <span>{ toggle_label }</span>
        </a>
      </div>

    </li>
  );

}

export default DropdownToggle;