import React, { Component } from "react";
import { connect } from 'react-redux';
import Citation from './Citation';

import { constructViewerQuery } from '../helpers/query';
import { env } from '../helpers/api';

import Superlink from './Superlink';

class Result extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      showCitation: false,
      showDocument: false,
      resultSelected: props.resultSelected || false,
      statisticsUrl: null
    }

    this.handleResultCheck = this.handleResultCheck.bind(this);
  }

  componentDidMount() {
    const { handle } = this.props;

    if (handle) {
      const statisticsUrl = this.formatStatisticsUrl(handle);

      this.setState((prevState) => ({
        ...prevState,
        statisticsUrl
      }));
    }
  }

  /**
   * formats handle from metadata to full url
   * @param {string} handle - handle from search result metadata
   * @returns {string}
   */
  formatStatisticsUrl(handle) {
    return `https://repository.oceanbestpractices.org/handle/${handle}/statistics`
  }
  
  hashLinkScroll() {
    const { hash } = window.location;
    if (hash !== '') {
      // Push onto callback queue so it runs after the DOM is updated,
      // this is required when navigating from a different page so that
      // the element is rendered on the page before trying to getElementById.
      setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) element.scrollIntoView();
      }, 0);
    }
  }

  handleTagToggle() {
    this.props.onSetTerms({
      id: this.props.id,
      title: this.props.title,
      terms: this.props.terms
    })
  }

  onReset() {
    this.props.onResetTerms();
  }

  /**
   * handles result checkbox event
   */
  handleResultCheck() {
    const {
      id,
      resultSelected
    } = this.state;

    // toggle the selected state and call the parent function (if it's a function)
    this.setState((prevState) => ({
      ...prevState,
      resultSelected: !resultSelected
    }), () => {
      if (typeof this.props.onCheck === 'function') {
        this.props.onCheck(id);
      }
    });
  }

  componentListFromStrings(string_list) {
    if ( !Array.isArray(string_list) ) return [];

    return string_list.map((string, i) => {
      return <span dangerouslySetInnerHTML={{__html: string}} key={string + i}/>
    });
  }

  launchPDF() {
    const pdfURL = `viewer/index.html?file=https://s3.amazonaws.com/obp-document-source-${env}/${this.props.uuid}.pdf&search=${constructViewerQuery(this.props.searchReducer.activeSearch, false)}`;
    window.open(pdfURL, '_blank');
    this.setState({showDocument: true});
  }

  render() {
    // Find out if the tags are active by comparing the id saved on the state saved to the
    // id of the current element
    const isActiveTags = this.props.termsReducer.activeTerms && this.props.termsReducer.activeTerms.id === this.props.id;
    const docHandle = this.props.handle ? "https://repository.oceanbestpractices.org/handle/" + this.props.handle : null;
    const { showCitation, showDocument } = this.state;

    var toggleClassName = isActiveTags ? 'result__button result__tag-button--is-active' : 'result__button';
    var toggleTagsIcon = isActiveTags ? 'fa fa-times' : 'fa fa-tags';
    var citationIcon = showCitation ? 'fa fa-times' : 'fa fa-quote-right';
    var toggleLabelClassName = isActiveTags ? 'result__tag-label result__tag-label--is-active' : 'result__tag-label';

    var authorList = null;
    if (this.props.author) {
      authorList = Array.isArray(this.props.author) ? this.props.author.join("; ") : [this.props.author].join(", ")
    }

    let result_title;

    if ( docHandle ) {
      result_title = (
        <h3 className="result__title">
          <Superlink to={docHandle} class_name="result__link" target="_blank" event_category="results" event_action="link | title" event_label={this.props.title}>
            {this.props.title}
          </Superlink>
        </h3>
      );
    } else {
      result_title = <h3 className="result__title">{this.props.title}</h3>;
    }

    //Don't show Generate Citation button if no citation available
    let citation_button = null;
    if (this.props.citation){
      citation_button = (
        <Superlink event_category="citation" event_action={`link | ${showCitation ? 'clear' : 'view'}`} event_label={showCitation ? 'Viewing Citation' : 'View Citation'}>
          <button className={`result__button result__button-secondary ${this.state.showCitation ? 'is-active': null}`} onClick={() => this.setState({ showCitation: !showCitation})} >
            <span className="result__button-icon"><i className={citationIcon} aria-hidden="true"></i></span>
            <span>{this.state.showCitation ? 'Citation Generated!': 'Generate Citation'}</span>
          </button>
        </Superlink>
      )
    }

    // Don't show export checkbox if no citation is available
    let export_citation_checkbox = null;
    if (this.props.citation) {
      export_citation_checkbox = (
        <div className="result__checkbox">
          <input type="checkbox" checked={this.props.resultSelected} onChange={() => this.handleResultCheck()}/>
        </div>
      )
    }

    //Don't show Explore Document button if no PDF available (that's what the sourceKey returns. a file name if PDF or "" if not a PDF)
    let document_button = null;
    if (this.props.sourceKey && !(this.props.sourceKey === "")) {
      document_button = (
        <Superlink event_category="explore-document" event_action={`link | ${showDocument ? 'clear' : 'view'}`} event_label={showDocument ? 'Exploring Document' : 'Explore Document'}>
          <button target="_blank" className="result__button result__button-secondary" onClick={this.launchPDF.bind(this)} >
            <span className="result__button-icon"><i className="fa fa-file-pdf-o" aria-hidden="false"></i></span>
            <span>Explore Document</span>
          </button>
        </Superlink>
      )
    }

    // Don't show statistics button if no handle exists in the metadata
    let statistics_button = null;
    if (this.state.statisticsUrl) {
      statistics_button = (
        <a
          className="result__button inverted"
          href={this.state.statisticsUrl}
          target="_blank"
        >
          <span className="result__button-icon">
            <i className="fa fa-bar-chart-o"/>
          </span>
          <span>
            View Statistics
          </span>
        </a>
      )
    }

    return (

        <article className="result">
          <section className="result__info">
            <div className="result__tags">
              <span className="result__tag">{this.props.date}</span>
              {
                this.props.language
                ? <span className="result__tag">{this.props.language}</span>
                : null
              }
              {
                this.props.methodology
                ? <span className="result__methodology">Methodology: {this.props.methodology}</span>
                : null
              }
            </div>
            {
              export_citation_checkbox
            }
            { result_title }
            
            <div className="result__author">
              {
                authorList || null
              }
            </div>
            <div className="result__journal-title">
              {
                this.props.journal_title || null
              }
            </div>
            <div className="result__highlight"> { this.componentListFromStrings(this.props.highlight) } </div>
            <div className="result__publisher">

              <Superlink event_category="results" event_action={`link | ${isActiveTags ? 'clear' : 'view'}`} event_label={isActiveTags ? 'Viewing Tags' : 'View Tags'}>
                <a className={toggleClassName} onClick={isActiveTags ? this.onReset.bind(this) : this.handleTagToggle.bind(this)} href="#tagSection">
                  <span className="result__button-icon"><i className={toggleTagsIcon} aria-hidden="true"></i></span>
                  <span className={toggleLabelClassName}></span>
                </a>
              </Superlink>

              {document_button}
              {citation_button}
              {statistics_button}

              <span className="result__publisher-data">{this.props.publisher}</span>
            </div>
            { showCitation
                ? <Citation citation={this.props.citation}/>
                : null
            }
          </section>
        </article>

    );
  }
}

export default connect(state => state)(Result);
