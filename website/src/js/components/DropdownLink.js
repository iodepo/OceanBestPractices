import React from 'react';

const DropdownLink = ({ title, id, onClick }) => {

  function handleClick(e) {
    if ( typeof onClick === 'function' ) {
      onClick(e);
    }
  }

  return (
    <li>
      <a onClick={handleClick} data-value={id || title}>{ title }</a>
    </li>
  );

}

export default DropdownLink;