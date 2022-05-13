import React, { Component } from 'react';
import { connect } from 'react-redux';

import { setActiveFields } from '../actions/fields';
import { clearActiveSearch, getSearch } from '../actions/search';
import { trackEvent } from '../actions/tracker';

import Dropdown from './Dropdown';
import DropdownLink from './DropdownLink';

class FieldsDropdown extends Component {

  constructor() {

    super();

    this.handleItemClick = this.handleItemClick.bind(this);

  }

  /**
   * handleItemClick
   * @description Triggers when a dropdown item is clicked
   */

  handleItemClick(e) {

    this.props.setActiveFields(e.currentTarget.dataset.value);

    this.props.trackEvent({
      category: 'dropdown',
      action: 'set active | Fields',
      label: e.currentTarget.dataset.value,
    });

  }

  /**
   * activeItem
   * @description Returns the current active item to display as the label
   */

  activeItem(e) {
    if ( !Array.isArray(this.props.fields) ) return {};
    return this.props.fields.filter(field => !!(field.active_search))[0] || {};
  }

  render() {
    return (
      <Dropdown label={this.activeItem().title} items={this.props.fields} item_component={DropdownLink} item_onClick={this.handleItemClick} />
    );
  }
}

const mapStateToProps = ( state ) => {

  return {
    fields: state.fields,
  };

};

const mapDispatchToProps = ( dispatch ) => {

  return {
    setActiveFields: field_id => dispatch( setActiveFields(field_id) ),
    clearActiveSearch: () => dispatch( clearActiveSearch() ),
    getSearch: () => dispatch( getSearch(null, { resetTerms: false }) ),
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FieldsDropdown);
