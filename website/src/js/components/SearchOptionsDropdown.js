import React, { Component } from 'react';
import { connect } from 'react-redux';

import { setOption } from '../actions/options';
import { getSearch } from '../actions/search';
import { trackEvent } from '../actions/tracker';

import Dropdown from './Dropdown';
import DropdownToggle from './DropdownToggle';

class SearchOptionsDropdown extends Component {

  constructor() {

    super();

    this.handleItemClick = this.handleItemClick.bind(this)

  }

  /**
   * handleItemClick
   * @description Triggers when a dropdown item is clicked
   */

  handleItemClick(e) {

    this.toggleOptionById(e.currentTarget.dataset.id);

  }

  /**
   * toggleOptionById
   * @description Given the ID, toggles the search option to on or off
   */

  toggleOptionById(id) {

    let option = this.props.options.filter(option => option.id === id)[0];

    this.props.setOption(id, !(option.value));
    this.props.getSearch(null, { preserveSearch: true });

    this.props.trackEvent({
      category: 'dropdown',
      action: 'toggle | Filter Options',
      label: `${id} | ${!(option.value)}`,
    });

  }

  options() {
    return this.props.options.filter(option => option.is_advanced_search);
  }

  hasActiveOptions() {
    return this.options().filter(option => !!(option.value)).length > 0;
  }

  getLabel() {
    let label = this.options().filter(options => !!(options.value))
    label = label.map(options => options.title)
    label = label.join(', ');
    if (label.length === 0) {
      return "Filter Options"
    }
    return label
  }

  render() {
    return (
      <Dropdown label={this.getLabel()} items={this.options()} item_component={DropdownToggle} has_active_items={this.hasActiveOptions()} item_onClick={this.handleItemClick} />
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
    setOption: (id, value) => dispatch( setOption(id, value) ),
    getSearch: (query, options) => dispatch(getSearch(query, { resetTerms: true, ...options })),
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchOptionsDropdown);
