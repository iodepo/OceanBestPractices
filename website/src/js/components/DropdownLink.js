import React from 'react';
import ReactTooltip from 'react-tooltip';

const DropdownLink = ({ title, id, help_text, onClick }) => {

  function handleClick(e) {
    if ( typeof onClick === 'function' ) {
      onClick(e);
    }
  }

  return (
    <li>
      <a onClick={handleClick} data-value={id || title} data-tip data-for={id}>
        {title}
        {/* TODO: tooltip class provided here for global styling of tooltips */}
        {/* For local styling, see options at https://www.npmjs.com/package/react-tooltip */}
        {
          help_text
          ? <ReactTooltip
              id={id}
              place='right'
              effect='solid'
              delayShow={300}
              className='tooltip'
            >
              {help_text}
            </ReactTooltip>
          : null
        }
      </a>
    </li>
  );

}

export default DropdownLink;