import React, { Component } from "react";

import Header from '../components/Header';
import Footer from '../components/Footer';

class Wrapper extends Component {
  render() {


    let header = '';
    let pageClass = 'wrapper';
    let footerLinks = '';

    if (this.props.header) {
      header = ( <Header showSearchBar={this.props.showSearchBar} history={this.props.history}/> );
    }

    if (this.props.page) {
      pageClass = `${pageClass} wrapper--${this.props.page}`
    }

    if (this.props.footerLinks) {
      footerLinks = this.props.footerLinks;
    }

    return (
        <section className={pageClass}>
          { header }
          <section className={this.props.childrenContainerClass}>
            {this.props.children}
          </section>

          <Footer footerLinks={footerLinks} />
        </section>
    );
  }
}

export default Wrapper;
