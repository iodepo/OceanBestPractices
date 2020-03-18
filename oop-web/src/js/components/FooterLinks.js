import React, { Component } from "react";

import LinkListItem from './LinkListItem';
import LinkListItemToggle from '../components/LinkListItemToggle';
import FullScreenModal from '../components/FullScreenModal';
import Superlink from '../components/Superlink';

const footer_links = [
  {
    to: 'https://repository.oceanbestpractices.org/page/about',
    title: 'About',
    class: '',
  },
  {
    to: 'https://repository.oceanbestpractices.org/page/faq',
    title: 'FAQ',
    class: '',
  },
  {
    to: 'https://repository.oceanbestpractices.org/feedback',
    title: 'Contact Us',
    class: '',
  },
  {
    to: '/tagger',
    title: 'OceanKnowledge Tagger',
    class: 'tagger__footer-link',
  },
];

class FooterLinks extends Component {
  render() {
    return (
      <div className='footer-links'>
        <ul className="link-list link-list--horizontal">
          { footer_links.map((link, index) => <LinkListItem className={`${link.class}`} key={`footer-link-${index}-${link.title}`} location="footer" {...link} />) }
          <LinkListItemToggle flipArrow="true" toggleButtonClass="link-list__item" toggleModalClass="link__list-toggle up" label="Submit Best Practice">
            <li>Submit a new best practice</li>
            <FullScreenModal smallModal="true" modalCTA="Get Templates" modalTitle="Best Practices Document Templates" location="home" modalClass="link-list">
              <div className="link__list-toggle-modal">
                <p>Select the template that best matches your document type.</p>
                <Superlink to="https://repository.oceanbestpractices.org/handle/11329/398" event_category="header" event_action="link" event_label="Sensors template">
                  Sensors
                </Superlink>
                <Superlink to="https://repository.oceanbestpractices.org/handle/11329/399" event_category="header" event_action="link" event_label="Sensors template">
                  Ocean Applications
                </Superlink>
                <Superlink to="https://repository.oceanbestpractices.org/handle/11329/400" event_category="header" event_action="link" event_label="Sensors template">
                  Data Management
                </Superlink>
              </div>
            </FullScreenModal>
            <Superlink class_name="link-list__link" to="https://repository.oceanbestpractices.org/submissions" event_category="footer" event_action="link" event_label="Submit a new Best Practice">
              Go to Submission Site
            </Superlink>
            <Superlink class_name="link-list__link" to="/tagger" event_category="footer" event_action="link" event_label="Ocean Knowledge Tagger">
              OceanKnowledge Tagger (Beta)
            </Superlink>
          </LinkListItemToggle>
        </ul>
      </div>
    );
  }
}

export default FooterLinks;
