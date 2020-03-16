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
    
    const terminology_descriptions = [
      {
        term: 'Controlled vocabulary',
        description: 'A list of terms controlled by some authority - e.g. a dropdown list.'
      },
      {
        term: 'Glossary',
        description: 'A collection of terms and their definitions, possibly with synonyms - e.g. NSIDC\'s Cryosphere Glossary: https://nsidc.org/cryosphere/glossary'
      },
      {
        term: 'Thesaurus',
        description: 'A structured controlled vocabulary where each term is annotated with information and/or metadata (e.g. definition, source) and its hierarchical, associative, or equivalence relationships to other terms in the thesaurus.'
      },
      {
        term: 'Taxonomy',
        description: 'A hierarchy of terms organized as a tree structure without formal relationships to terms in other trees. Terms that are deeper in the tree (i.e. towards the leaves) may gain and lose properties relative to their ancestors.'
      },
      {
        term: 'Ontology',
        description: 'A formal representation of knowledge, typically in a graph or network structure, with both human and machine-readable definitions, with logical relationships (axioms) between the terms, which together define a domain of knowledge.'
      },
    ]

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
    );
    const termDescriptions = (
      terminology_descriptions.map((description, index) =>
      <div className='terminology-descriptions'>
        <p className='terminology-descriptions__terms'>{description.term}</p>
        <p>{description.description}</p>
      </div>
      )
    )
    const hasErrored = this.props.statsReducer.hasErrored;
    const terminologies = `terminolog${ ontologies > 1 ? 'ies' : 'y' }`;
    const termDescriptionCTA = (
      <span className='fa fa-question-circle-o'></span>
    );
    const termDescriptionModal = (
      <FullScreenModal smallModal="50%" modalCTA={termDescriptionCTA} modalTitle='Descriptions of Terminologies' modalClass='terminology-modal' location="landing">
        {termDescriptions}
      </FullScreenModal>
    );
    const termModal = (
      <FullScreenModal modalCTA={terminologies} modalTitle='Terminologies' modalClass='stats-modal' location="landing" titleCTA={termDescriptionModal}>
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
