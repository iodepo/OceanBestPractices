import React, { Component } from "react";

class HeaderBanner extends Component {
  render() {
    return (
      <div className='header__under-beta-container'>
        <span><i className='fa fa-exclamation-triangle'></i></span>
        <span>Under Development</span>
      </div>
    );
  }
}

export default HeaderBanner;
