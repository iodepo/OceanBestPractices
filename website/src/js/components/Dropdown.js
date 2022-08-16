import React, { Component } from 'react';
import { connect } from 'react-redux';

import { trackEvent } from '../actions/tracker';

class Dropdown extends Component {

  constructor(props) {

    super(props);

    const default_item = this.defaultItem(props);

    this.state = {
      is_open: false,
      label: ( default_item && default_item.title ) || 'Select',
    }

    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleDropdownItemClick = this.handleDropdownItemClick.bind(this);
    this.handleDropdownLinkClick = this.handleDropdownLinkClick.bind(this);
    this.setRef = this.setRef.bind(this);

  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleDocumentClick);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleDocumentClick);
  }

  /**
   * handleDocumentClick
   * @description Triggers when page document is clicked. Useful for dismissing the dropdown
   */

  handleDocumentClick(e) {
    if ( this.dropdown && !this.dropdown.contains(e.target) ) {
      this.toggleDropdownVisibility('closed');
    }
  }

  /**
   * handleDropdownLinkClick
   * @description Triggers when the main dropdown button link is clicked
   */

  handleDropdownLinkClick() {



    this.toggleDropdownVisibility();

  }

  /**
   * handleDropdownItemClick
   * @description Triggers when a dropdown item is clicked
   */

  handleDropdownItemClick(e) {

    this.setState({
      label: e.currentTarget.text,
      is_open: false,
    });

    if ( typeof this.props.item_onClick === 'function' ) {
      this.props.item_onClick(e);
    }

  }

  /**
   * toggleDropdownVisibility
   * @description Updates the visibility state of the dropdown
   */

  toggleDropdownVisibility(force_state = false) {

    let open_state;

    if ( force_state ) {
      open_state = force_state === 'open' ? true : false;
    } else {
      open_state = !(this.state.is_open);
    }

    if ( open_state ) {
      this.fireEvent({
        event_action: 'open',
      });
    }

    this.setState({
      is_open: open_state
    });

  }

  /**
   * fireEvent Fires a GA event
   * @description
   */

  fireEvent({ event_category, event_action, event_label}) {

    this.props.trackEvent({
      category: event_category || 'dropdown',
      action: event_action,
      label: event_label || this.label(),
    });

  }/**
   * 
   * dropdownClassName
   * @description class of the dropdown button - changes based on page
   */

  dropdownClassName() {
    let className = "button button__dropdown";
    console.log(this.props.page)
    if (this.props.page === "landing") {
      
      className += " landing-page"
    }
    return className;
  }

  /**
   * dropdownIconClassName
   * @description Class of the icon that supplements the dropdown button
   */

  dropdownIconClassName() {
    let class_name = 'fa';
    if (this.props.has_active_items) {
      return 'fa fa-filter fa-lg';
    }
    return `${class_name} ${this.state.is_open ? "fa-caret-up" : "fa-caret-down"}`;
  }

  /**
   * defaultItem
   * @description Item that's defaulted to when the component loads
   */

  defaultItem(props = this.props) {
    if ( !Array.isArray(props.items) ) return {};
    return props.items.filter(item => item.default)[0];
  }

  /**
   * setRef
   * @description Sets the component reference to the DOM node
   */

  setRef(node) {
    this.dropdown = node;
  }

  label() {
    return this.props.label || this.state.label;
  }

  render() {

    const ItemComponent = this.props.item_component;

    return (
      <div ref={this.setRef} className="dropdown" data-has-active-items={this.props.has_active_items}>

        <a className={this.dropdownClassName()} onClick={this.handleDropdownLinkClick}>
          { this.label() }
          <i className={this.dropdownIconClassName()}></i>
        </a>

        <ul className={`dropdown__content ${this.state.is_open ? 'active' : ''}`}>
          {
            Array.isArray(this.props.items) && this.props.items.map((item, index) => {
              return (
                <ItemComponent key={`dropdown-item-${index}`} {...item} onClick={this.handleDropdownItemClick} />
              );
            })
          }
        </ul>

      </div>
    );

  }

}

const mapDispatchToProps = ( dispatch ) => {

  return {
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  null,
  mapDispatchToProps
)(Dropdown);