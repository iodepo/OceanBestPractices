import React from 'react';

import Superlink from './Superlink';
import FullScreenModal from './FullScreenModal'

const LinkListItem = ({to, title, location, className}) => {
  
  if (to === 'citation') {
    return (
      <li className={`link-list__item ${className}`}>
        <Superlink class_name="link-list__link" event_category={location || 'website'} event_action="link" event_label={title}>
          <FullScreenModal modalCTA={title} modalTitle='How to Cite' modalClass='header-modal' location="landing">
            <div className='disclaimer'>
              OceanBestPractices System (OBPS). Oostende, Belgium, International Oceanographic Data and Information Exchange(IODE) of UNESCO-IOC Available: https://www.oceanbestpractices.org/ (Accessed ...)
            </div>
          </FullScreenModal>
        </Superlink>
      </li>
    );
  }
  return (
    <li className={`link-list__item ${className}`}>
      <Superlink class_name="link-list__link" to={to} event_category={location || 'website'} event_action="link" event_label={title}>
        { title }
      </Superlink>
    </li>
  );
}

export default LinkListItem;
