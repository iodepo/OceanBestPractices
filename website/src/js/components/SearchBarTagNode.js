import React, { Component } from "react";
import { connect } from 'react-redux';

import { trackEvent } from '../actions/tracker';

class SearchBarTagNode extends Component {

  constructor() {

    super();

    this.handleClick = this.handleClick.bind(this);

  }

  handleClick() {

    this.props.onClick(this.props.tag, 'clear');

    this.props.trackEvent({
      category: 'tag',
      action: 'clear',
      label: this.props.tag,
    });

  }

  render() {

    if ( typeof this.props.tag !== 'object' ) return null;

     if (this.props.className === 'searchbar__split-tag-field') {
       return (
         <span className='searchbar__tag-field' onClick={this.handleClick}>
           { this.props.tag.value }    
         </span>
       );
     }
    else {
     return (
       <span className='searchbar__tag-node' onClick={this.handleClick}>
         { this.props.tag.value }
         <i className='fa fa-close' aria-hidden="true"></i>
       </span>
     );

   }
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
)(SearchBarTagNode);