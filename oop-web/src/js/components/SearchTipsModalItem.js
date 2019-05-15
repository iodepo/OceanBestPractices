import React from 'react';

const SearchTipsModalItem = ({ number, header, content, children }) => {
  
  return (
    <div className='tip__modal-item'>
      <h3 className='tip__modal-item-header'>{number}. {header}</h3>
      <div className='tip__modal-item-body'>{content}</div>
      <div className='tip__modal-item-children'>{children}</div>
    </div>
  )
}

export default SearchTipsModalItem;
