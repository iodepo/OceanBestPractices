import React, { Component } from "react";
import { connect } from 'react-redux';

import { getSearch, clearAllSearch } from '../actions/search';
import { setActiveFields } from '../actions/fields';
import { resetTerms } from '../actions/terms';
import { activeAdvancedOptionsString } from '../helpers/options';

import SearchTipsModal from './SearchTipsModal';
import Superlink from './Superlink';

class SearchBarAdvancedStatus extends Component {

  constructor() {

    super();

    this.handleClearClick = this.handleClearClick.bind(this);

  }

  handleClearClick(e) {

    e.preventDefault();
    this.props.setActiveFields('all');
    this.props.resetTerms();
    this.props.clearAllSearch();

  }

  render() {

    return (
      <div className="searchbar__advanced--status">

        <ul>
          <li>
            <SearchTipsModal call='Search Tips' location="searchbar" />
          </li>
          <li>
            <Superlink to="/" event_category="searchbar" event_action="clear search" event_label="Clear All" onClick={this.handleClearClick}>
              Clear All
            </Superlink>
          </li>
        </ul>

        <SearchBarAdvancedStatusOptions options={this.props.options} />

      </div>
    );

  }
}

const mapStateToProps = ( state ) => {

  return {
    options: state.options,
  };

};

const mapDispatchToProps = ( dispatch ) => {

  return {
    getSearch: () => dispatch( getSearch({resetTerms: true}) ),
    clearAllSearch: () => dispatch( clearAllSearch() ),
    setActiveFields: field_id => dispatch( setActiveFields(field_id) ),
    resetTerms: () => dispatch( resetTerms() ),
  };

};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchBarAdvancedStatus);


const SearchBarAdvancedStatusOptions = ({options}) => {

  if ( !Array.isArray(options) || options.length === 0 ) return null;

  const active_options_string = activeAdvancedOptionsString(options, 'title', ', ');

  if ( !active_options_string ) return null;

  return (
    <span>Advanced: { active_options_string }</span>
  );

}
