import React, { Component } from "react";
import { connect } from 'react-redux';

import { autocompleteIsSelected } from '../actions/autocomplete';
import { trackEvent } from '../actions/tracker';

class Autocomplete extends Component {

  constructor(props) {
    super(props);

    this.setWrapperRef = this.setWrapperRef.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);

  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  setWrapperRef(node) {
    this.wrapperRef = node;
  }

  // This will fire when a click happens outside of the autocomplete container

  handleClickOutside(event) {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.props.dispatch(autocompleteIsSelected(true));
    }
  }

  // Fired when an autocomplete item is clicked

  onAutocompleteClick(i) {

    this.props.onAutocompleteClick(i);
    this.props.dispatch(autocompleteIsSelected(true));

    this.props.trackEvent({
      category: 'searchbar',
      action: 'autocomplete | select',
      label: i,
    });

  }

  // Splits up the result to enable highlighting of typed word

  getHighlightedText(text, highlight) {
    highlight = highlight || '';
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    const highlightToLower = highlight.toLowerCase();

    const highlightedParts = parts.map((part, i) => {
      return part.toLowerCase() === highlightToLower ? <em key={i}>{ part }</em> : <span key={i}>{ part }</span>
    })

    return <button type="button" className="autocomplete__button" onClick={() => this.onAutocompleteClick(text)}>{highlightedParts}</button>
  }

  fieldRequestsAutocomplete() {
    const active_field = this.props.fields.filter(field => !!(field.active_search))[0];
    if ( !active_field || !active_field.id ) return false;
    return this.props.fields.filter(field => active_field.id === field.id && !!(field.autocomplete)).length > 0;
  }

  render() {

    if ( !this.fieldRequestsAutocomplete() ) return null;

    const { autocompleteReducer } = this.props;

    let results = null,
        resultsList = null;
        
    if (autocompleteReducer.isSelected) {
      results = null;
      resultsList = null;
    }
        
    else if (autocompleteReducer.isLoading) {
      results = (
        <ul ref={this.setWrapperRef} className="autocomplete__list">
          <li className="autocomplete__item">
            <button type="button" className="autocomplete__button">Loading...</button>
          </li>
        </ul>
      )
    }

    else if (autocompleteReducer.results && autocompleteReducer.results.length) {
      if(autocompleteReducer.query === this.props.searchReducer.search){
      
        resultsList = autocompleteReducer.results.map((result, i) => {

          const query = autocompleteReducer.query;
          const highlightedResult = this.getHighlightedText(result, query);

          return <li key={i} className="autocomplete__item">{highlightedResult}</li>
        })

        results = (
          <ul ref={this.setWrapperRef} className="autocomplete__list">{resultsList}</ul>
        )
      }
    }

    return results;
  }
}

const mapDispatchToProps = ( dispatch ) => {

  return {
    dispatch: dispatch,
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  state => state,
  mapDispatchToProps
)(Autocomplete);
