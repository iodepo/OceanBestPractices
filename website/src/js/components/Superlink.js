import React, { Component } from 'react';
import { connect } from 'react-redux';

import { trackEvent } from '../actions/tracker';

import { Link } from 'react-router-dom';

class Superlink extends Component {

  constructor() {

    super();

    this.handleClick = this.handleClick.bind(this);

  }

  handleClick(e) {

    if ( this.props.to && this.isExternalLink() && this.props.target !== '_blank' ) {

      e.preventDefault();

      setTimeout(() => {
        window.location = this.props.to;
      }, 100);

    }

    this.fireEvent();

    if ( typeof this.props.onClick === 'function' ) {
      this.props.onClick(e);
    }

  }

  fireEvent() {

    if ( !this.props.event_category || !this.props.event_action ) {
      return;
    }

    const label_prefix = this.isExternalLink() ? 'external' : 'internal';

    this.props.trackEvent({
      category: this.props.event_category,
      action: this.props.event_action,
      label: `${label_prefix} | ${this.props.event_label}`,
      value: this.props.event_value,
    });

  }

  isExternalLink() {

    // if there's no to value, that typically means we're not even dealing with a link,
    // so let's consider that internal

    if ( typeof this.props.to !== 'string' ) return false;

    return this.props.to.charAt(0) !== '/';

  }

  render() {

    const component_props = {
      className: this.props.class_name,
      onClick: this.handleClick,
    }

    if ( this.props.to && !this.isExternalLink() ) {
      return (
        <Link to={this.props.to} {...component_props}>
          { this.props.children }
        </Link>
      );
    }

    if ( this.props.to ) {
      return (
        <a href={this.props.to} target={this.props.target} rel={this.props.rel || 'noopener noreferrer'} {...component_props}>
          { this.props.children }
        </a>
      );
    }

    return (
      <span {...component_props}>
        { this.props.children }
      </span>
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
)(Superlink);