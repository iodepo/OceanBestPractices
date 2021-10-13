import React, { Component } from "react";

import SearchBar from './SearchBar';
import HeaderBanner from './HeaderBanner';
import Superlink from './Superlink';

class Header extends Component {
  render() {
    return (
      <header className="header">
        <HeaderBanner />
        <section className="header__main-container">
          <Superlink to="/" class_name="header__logo-link" event_category="header" event_action="link" event_label="logo | Ocean Best Practices">
            <h1 className="header__logo ir">Ocean Best Practices</h1>
          </Superlink>
          <div className="header__search-container">
            <SearchBar history={this.props.history} />
          </div>
        </section>
      </header>
    );
  }
}

export default Header;
