import React, { Component } from "react";
import { connect } from 'react-redux';

import FullScreenModal from './FullScreenModal';
import Superlink from './Superlink';

class Stats extends Component {

  render() {
    
    const terminology_links = [
      {
        to: 'http://www.obofoundry.org/ontology/envo.html',
        title: 'Environment Ontology (ENVO)',
      },
      {
        to: 'https://github.com/SDG-InterfaceOntology/sdgio',
        title: 'Sustainable Development Goals Interface Ontology (SDGIO)',
      },
      {
        to: 'http://www.obofoundry.org/ontology/chebi.html',
        title: 'Chemical Entities of Biological Interest (CHEBI)',
      },
      {
        to: 'http://vocab.nerc.ac.uk/collection/L05/current/',
        title: 'SeaDataNet Device Categories (L05)',
      },
      {
        to: 'http://vocab.nerc.ac.uk/collection/L06/current/',
        title: 'SeaVoX Platform Categories (L06)',
      },
      {
        to: 'http://vocab.nerc.ac.uk/collection/L22/current/',
        title: 'SeaVoX Device Catalogue (L22)',
      },
    ];

    const {
      documents,
      ontologies,
      terms
    } = this.props.statsReducer.stats;
    
    const termLinks = (
      terminology_links.map((link, index) =>
        <li key={index}>
          <Superlink to={link.to}>{link.title}</Superlink>
        </li>
      )
    )
    const hasErrored = this.props.statsReducer.hasErrored;
    const terminologies = `terminolog${ ontologies > 1 ? 'ies' : 'y' }`;
    const termModal = (
      <FullScreenModal modalCTA={terminologies} modalTitle='Terminologies' modalClass='stats-modal' location="landing">
        <ul className='stats__modal'>
          {termLinks}
        </ul>
      </FullScreenModal>
    );

    let content = (
      <span className="stats">Loading stats...</span>
    );

    if ( documents ) {
      content = (
        <span className="stats">
          Search <strong>{documents} documents</strong> tagged with <strong>{terms} terms</strong> from <strong>{ontologies} {termModal}</strong>
        </span>
      );
    }

    if ( hasErrored ) {
      content = (
        <span className="stats">Sorry, we can't display our stats at this time.</span>
      )
    }



    return (
      <span>
        {content}
      </span>
    );
  }
}

export default connect(state => state)(Stats);
