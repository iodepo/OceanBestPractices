import React, { Component } from "react";
import { connect } from 'react-redux';

import Wrapper from './Wrapper';
import SearchBar from '../components/SearchBar';
import SearchTipsModal from '../components/SearchTipsModal';
import FullScreenModal from '../components/FullScreenModal';
import Stats from '../components/Stats';
import LinkListItem from '../components/LinkListItem';
import LinkListItemToggle from '../components/LinkListItemToggle';
import Superlink from '../components/Superlink';

import { clearAllSearch } from '../actions/search';
import { getStats } from '../actions/stats';

import unesco_ioc_obp_logo from '../../images/unesco-ioc-ocb-lockup-2x.png';

const navigation_links = [
  {
    to: 'https://repository.oceanbestpractices.org/page/about',
    title: 'About',
  },
  {
    to: 'citation',
    title: 'Recommended Citation',
  },
  {
    to: 'https://repository.oceanbestpractices.org/page/faq',
    title: 'FAQ',
  },
  {
    to: 'https://repository.oceanbestpractices.org/feedback',
    title: 'Contact Us',
  },
];

const firstVisitCookieName = "obp-search_visited";

class Main extends Component {

  componentDidMount() {

    this.props.dispatch(getStats());

    // Clear the search query for mount. If a user navigates back to the homepage,
    // we shouldn't carry the search state through intended navigation

    this.props.dispatch(clearAllSearch());

  }

  handleSearchButtonClick() {
    this.props.history.push('/search');
  }

  // sets cookie on welcome message modal close
  handleWelcomeModalClose() {
    const cookieDate = new Date();
    cookieDate.setFullYear(cookieDate.getFullYear() + 1);
    document.cookie = `${firstVisitCookieName}=true; expires=${cookieDate.toUTCString()};`;
  }

  render() {

    const { search, activeSearch } = this.props.searchReducer;

    const isFirstTimeVisit = !document.cookie.includes(firstVisitCookieName);

    return (
      <Wrapper header={false} page="landing" childrenContainerClass="landing" footerLinks={true}>
        <section className='landing__header'>

          <div className='link-list--landing'>

            <ul className="link-list link-list--horizontal">
              { navigation_links.map((link, index) => <LinkListItem key={`navigation-link-${index}-${link.title}`} location="header" {...link} />) }
            </ul>
            <span className="link-list__link--emphasis">
              <Superlink class_name="link-list__link link-list__link-tagger" to="/tagger" event_category="header" event_action="link" event_label="Ocean Knowledge Tagger">
                OceanKnowledge Tagger
              </Superlink>
              <LinkListItemToggle toggleButtonClass="link-list__link--emphasis" toggleModalClass="link__list-toggle down" label="Submit A New Best Practice">
                <FullScreenModal smallModal="true" modalCTA="Get Templates" modalTitle="Best Practices Document Templates" location="home" modalClass="link-list">
                  <div className="link__list-toggle-modal">
                    <p>Select the template that best matches your document type.</p>
                    <Superlink to="https://repository.oceanbestpractices.org/handle/11329/1243" event_category="header" event_action="link" event_label="Sensors template">
                      Sensors
                    </Superlink>
                    <Superlink to="https://repository.oceanbestpractices.org/handle/11329/1246" event_category="header" event_action="link" event_label="Sensors template">
                      Ocean Applications
                    </Superlink>
                    <Superlink to="https://repository.oceanbestpractices.org/handle/11329/1245" event_category="header" event_action="link" event_label="Sensors template">
                      Data Management
                    </Superlink>
                  </div>
                </FullScreenModal>
                <Superlink class_name="link-list__link" to="https://repository.oceanbestpractices.org/submissions" event_category="header" event_action="link" event_label="Submit a new Best Practice">
                  Go to Submission Site
                </Superlink>
                <Superlink class_name="link-list__link" to="/tagger" event_category="header" event_action="link" event_label="Ocean Knowledge Tagger">
                  OceanKnowledge Tagger
                </Superlink>
              </LinkListItemToggle>
            </span>
          </div>

        </section>
        <section className="landing__search-container">
          <img className="landing__obp-logo" src={unesco_ioc_obp_logo} alt="United Nations, Educational, Scientific and Cultural Organization Logo | Intergovernmental Oceanographic Commission Logo | Ocean Best Practices Logo" width="591" height="234"/>
          <div className="landing__search">
            <SearchBar history={this.props.history}/>
          </div>
          <button className="button landing__search-button"
            onClick={this.handleSearchButtonClick.bind(this)}
            disabled={!search.length && activeSearch.length === 0}>
              Search
          </button>
          <SearchTipsModal
            call="Search Tips"
            location="home"
            hoverText="How to get the best out of your search"
          />
          <div className="landing__archive">
            <Stats />
          </div>
        </section>

        {isFirstTimeVisit && (
          <FullScreenModal
            open={true}
            noLink={true}
            modalTitle="Welcome to Ocean Best Practices"
            onClose={this.handleWelcomeModalClose}
            closeLabel="Accept and Continue"
          >
            <div className="link__list-toggle-modal welcome-modal">
              <p>
                OceanBestPractices (OBP) is a secure, permanent document (and other objects) repository. 
                It aims to provide a discovery point for research groups to search and find community accepted existing ocean best practices. 
                This service also invites the ocean research, observation and data/information management communities to submit their own best practice documents to share globally with their colleagues.
              </p>
              <p>
                The OBPS-Repository is a global repository of ocean research, operations and applications  methods (also known as “Best Practices”) <b>*</b>
              </p>
              <p className="foot-notes">
                <b>*</b> A Best Practice is defined as  “a methodology that has repeatedly produced superior results relative to other methodologies with the same objective”. 
                To be fully elevated to a best practice, a promising method will have been adopted and employed by multiple organizations.
              </p>
              <p className="highlighted">
                Please note, unless it is annotated as Endorsed by an expert panel, inclusion of a record in OBPS does not indicate a recommendation of methodology by OBPS.
              </p>
            </div>
          </FullScreenModal>
        )}
      </Wrapper>
    );
  }
}

export default connect(state => state)(Main);
