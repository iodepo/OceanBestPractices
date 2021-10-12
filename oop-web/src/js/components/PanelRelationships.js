import React, { Component } from "react";
import { connect } from 'react-redux';

import RelationshipListItem from './RelationshipListItem';
import Superlink from './Superlink';

import { getRelationships, resetRelationships } from '../actions/relationships';
import {  getSearch, searchSetFilter } from '../actions/search';
import { trackEvent } from '../actions/tracker';
import convertFiltersToLabels from '../helpers/convertFiltersToLabels';

import ViewTagsIcon from '../../images/ViewTags-Icon.svg'
import SearchTipsModal from './SearchTipsModal';

class PanelRelationships extends Component {

  constructor(props) {
    super(props);

    this.state = {
      viewAllTerms: false,
      view: 'terms',
      activeFilters: {}
    }
  }

  componentDidUpdate(prevProps) {

    // If we have an active terms ID and it doesn't match the previous ID, we want to
    // trigger the UI to go "back" to the full list of available terms

    if ( this.props.termsReducer.activeTerms.id && prevProps.termsReducer.activeTerms.id !== this.props.termsReducer.activeTerms.id ) {
      this.onBackClick();
    }

  }

  onViewAllClick() {
    this.setState({
      viewAllTerms: !this.state.viewAllTerms
    });
  }

  onSetRelationship(obj) {
    this.props.dispatch(resetRelationships());
    this.props.dispatch(getRelationships(obj));
    this.setState({
      view: 'list'
    })
  }

  checkRelationshipChange(uri) {
    let activeTerms = convertFiltersToLabels(this.props.searchReducer.activeFilters);
    let isActive = false;
    for(let i = 0; i < activeTerms.length; i++) {
      if(activeTerms[i] === uri) isActive = true;
    }
    return isActive;
  }

  onSetRelationshipChange(event, termURI, label, resetTerms, type) {

    this.props.dispatch(searchSetFilter(termURI, label, event.target.checked));
    this.props.dispatch(getSearch(this.props.searchReducer.search, {resetTerms: resetTerms}));

    this.props.dispatch(trackEvent({
      category: 'results',
      action: 'link | tags',
      label: `${type} | ${label}`
    }));

  }

  onBackClick() {
    this.setState({
      view: 'terms'
    });
  }

  render() {

    const termsActive = this.props.termsReducer.activeTerms.terms || false;

    let relationshipTerms = '',
        terms = {},
        termsList = '',
        termsToShow = [],
        relationshipsList = '';

    // If we have terms, build out the list of buttons

    // TODO: Pass in the uri instead of the lable into onSetRelationship

    terms = this.props.termsReducer.activeTerms && this.props.termsReducer.activeTerms.terms.map((term, i) => {

      let type = '',
          ontologyTag = null;

      switch (true) {
        case term.uri.indexOf('ENVO') > -1:
          type = 'ENVO';
          break;
        case term.uri.indexOf('CHEBI') > -1:
          type = 'CHEBI';
          break;
        case term.uri.indexOf('SDGIO') > -1:
          type = 'SDGIO';
          break;
        case term.uri.indexOf('L05') > -1:
          type = 'SDN Devices';
          break;
        case term.uri.indexOf('L06') > -1:
          type = 'SeaVoX Platform Categories';
          break;
        case term.uri.indexOf('L22') > -1:
          type = 'SeaVox Device Catalogue';
          break;
        default:
          break;
      }

      ontologyTag = type
        ? <span> ({type})</span>
        : null;

      return (
        <li key={i} className="search-sidebar__term-item">
          <Superlink event_category="results" event_action="link | tag" event_label={term.label}>
            <input className="search-sidebar__term-filter-button" type="checkbox" checked={this.checkRelationshipChange(term.uri)} onChange={(event) => this.onSetRelationshipChange(event, term.uri, term.label, false)}/>
            <button className="search-sidebar__term-button" onClick={() => this.onSetRelationship({label: term.label, uri: term.uri}) }>
              {term.label}
              <i className="search-sidebar__term-filter-logo fa fa-chevron-right"></i>
              <span className="search-sidebar__term-tag">{ontologyTag}</span>
            </button>
            </Superlink>
        </li>
      )
    });

    if (terms.length > 0) {

      if (!this.state.viewAllTerms) {

        termsToShow = terms.map((tag) => {
          return tag;
        }).splice(0,9);

        termsToShow.push(
          <li key="view-all" className="search-sidebar__term-item ">
            <Superlink event_category="results" event_action="link | tags" event_label="All Tags">
              <button className="search-sidebar__term-button search-sidebar__term-button--view-all" onClick={this.onViewAllClick.bind(this)}>
                <i className="fa fa-tags" aria-hidden="true" /> All Tags <span className="search-sidebar__term-button--quantity">({terms.length})</span>
              </button>
            </Superlink>
          </li>
        );

      } else {

        termsToShow = terms.map((tag) => {
          return tag;
        })

        termsToShow.push(
          <li key="view-all" className="search-sidebar__term-item ">
            <Superlink event_category="results" event_action="link | tags" event_label="Less Tags">
              <button className="search-sidebar__term-button search-sidebar__term-button--view-all" onClick={this.onViewAllClick.bind(this)}>
                Less Tags
              </button>
            </Superlink>
          </li>
        );
      }
    }

    // If we have terms, throw them in a list

    if (termsToShow) {
      termsList = <ul className="search-sidebar__term-list">
        {termsToShow}
      </ul>
    }

    if ( termsActive.length ) {
      relationshipTerms = (
        <section>
          { termsList }
        </section>
      )
    } else {
      relationshipTerms = (
        <section>
          <header className="search-sidebar__header">
            <div className='search-sidebar__icon'><img src={ViewTagsIcon} alt='View Tags Icon'></img></div>
            <span className="search-sidebar__message">
            Select <strong> <i className="fa fa-tags" aria-hidden="true" /> View Tags </strong> on a search result to  view keywords associated with that document and their relationships.
            </span>
          </header>
        </section>
      )
    }

    let relationshipsItems = '';

    const relationships = this.props.relationshipsReducer.activeRelationships.relationships;
    let relationshipsArr = [];

    for(var type in relationships) {
      if(relationships.hasOwnProperty(type)) {
        for(var relationship in relationships[type]) {
          if(relationships[type].hasOwnProperty(relationship)) {
            relationshipsArr.push({
              type: relationship,
              items: relationships[type][relationship],
              graphDirection: type
            });
          }
        }
      }
    }

    // ppilone: This is a little hacky but we want to make sure the "is a" relationship
    // is always shown first. The relationships from the API are a hash so this is the first
    // time we have any kind of order related to term relationships. This code just sorts
    // the relationship and treats all as equal except for "is a".
    let priorityRelation = "is a";
    relationshipsArr.sort((x, y) => { return x.type === priorityRelation ? -1 : y.type === priorityRelation ? 1 : 0; });

    relationshipsItems = relationshipsArr.map((relationship, i) => {

      let items = [];

      for (var j = 0; j < relationshipsArr[i].items.length; j++) {

        let item = relationshipsArr[i].items[j];
        var checkedRelationshipClass = this.checkRelationshipChange(item.uri) ? 'search-sidebar__relationship-item search-sidebar__relationship-item-active' : 'search-sidebar__relationship-item';
        items.push(
          <div key={j} className={checkedRelationshipClass}>
            <label className="search-sidebar__relationship-label" htmlFor={`rel_${item.label}`}>
              <input className="search-sidebar__relationship-input" type="checkbox" id={`rel_${item.label}`} name={`rel_${item.label}`} value={item.uri} checked={this.checkRelationshipChange(item.uri)} onChange={(event) => this.onSetRelationshipChange(event, item.uri, item.label, true, relationshipsArr[i].type)}/>
              {item.label}
            </label>
          </div>
        );
      }

      return (
        <RelationshipListItem key={i} items={items} type={relationshipsArr[i].type} graphDirection={relationshipsArr[i].graphDirection} />
      )
    });

    if (!this.props.relationshipsReducer.activeRelationships && !this.props.relationshipsReducer.isLoading) {
      relationshipsList = <div>
        <header className="search-sidebar__header">
          <span className="search-sidebar__memo">You must select a tag to view relationships</span>
        </header>
      </div>
    } else if (this.props.relationshipsReducer.isLoading) {
      relationshipsList = <div>
        <header className="search-sidebar__header">
          <span className="search-sidebar__memo"><i className="fa fa-spinner loading-spinner"></i></span>
          <Superlink event_category="results" event_action="link | tags" event_label="Return to Tags">
            <button className="search-sidebar__back-button" onClick={() => this.onBackClick()}>
              <i className="fa fa-chevron-left" aria-hidden="true" /> Return to Tags
            </button>
          </Superlink>
        </header>
      </div>
    } else {
      relationshipsList = <div>
        <header className="search-sidebar__header">
          <Superlink event_category="results" event_action="link | tags" event_label="Return to Tags">
            <button className="search-sidebar__back-button" onClick={() => this.onBackClick()}>
              <i className="fa fa-chevron-left" aria-hidden="true" /> {this.props.relationshipsReducer.activeRelationships.title} = <i className="fa fa-tag search-sidebar__relationship-tag-icon search-sidebar__relationship-tag-icon-header" aria-hidden="true" />
            </button>
          </Superlink>
        </header>
        <ul className="search-sidebar__relationships-list">
          {relationshipsItems}
        </ul>
      </div>
    }

    return (
      <div className="search-sidebar__content" id="tagSection">
      <span><SearchTipsModal call="More about tags" to="UsingTags" /></span>
        {
          this.state.view === 'terms'
          ? relationshipTerms
          : relationshipsList
        }
      </div>
    );
  }
}

export default connect(state => state)(PanelRelationships);
