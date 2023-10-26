import React, { Component } from "react";
import { connect } from 'react-redux';

import Wrapper from './Wrapper';
import SidebarSidebar from '../components/SearchSidebar'
import SearchResults from '../components/SearchResults'

class Search extends Component {

  render() {

    const history = this.props.history;

    return (
        <Wrapper header={true} history={history} childrenContainerClass="search" footerLinks={true}>
          {/* <SidebarSidebar /> */}
          <SearchResults />
        </Wrapper>
    );
  }
}

export default connect(state => state)(Search);
