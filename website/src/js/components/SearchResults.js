import React, { Component } from "react";
import { connect } from 'react-redux';
import { getLangNameFromCode } from 'language-name-map';

import { getSearch } from '../actions/search';
import { setOption } from '../actions/options';
import { defaultQuerySize } from '../helpers/api';

import { setTerms, resetTerms } from '../actions/terms';

import Result from './Result';
import SearchFilter from './SearchFilter';
import SearchStatus from './SearchStatus';
import SearchPagination from './SearchPagination';
import Superlink from './Superlink';
import { downloadToFile } from '../helpers/downloadToFile';

class SearchResults extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedResults: []
    }

    this.onSelectOneResult = this.onSelectOneResult.bind(this);
  }

  componentDidMount() {

    // This will catch the case in which we have arrived on this page without using the search input on /search.
    // This only happens when the user is moving over from the landing page

    if (this.props.searchReducer.search) {
      this.props.dispatch(getSearch({resetTerms: true}));
    }
  }

  onSetPage(page) {
    this.props.dispatch(setOption('offset', page * defaultQuerySize));
    this.props.dispatch(getSearch({resetTerms: true}));
  }

  onSetTerms(terms) {
    this.props.dispatch(setTerms(terms));
  }

  onResetTerms() {
    this.props.dispatch(resetTerms());
  }

  /**
   * handles selection of all results
   * @param {array} items - array of all result items
   */
  onSelectAllResults(items) {
    const mappedItemIds = items.map(({ id }) => (id));

    this.setState((prevState) => ({
      ...prevState,
      selectedResults: mappedItemIds
    }));
  }

  /**
   * handles deselection of all results
   */
  onDeselectAllResults() {
    this.setState((prevState) => ({
      ...prevState,
      selectedResults: []
    }));
  }

  /**
   * toggles selection of one result item
   * @param {string} resultId - id of a single result
   */
  onSelectOneResult(resultId) {
    const { selectedResults } = this.state;
    const resultIndex = selectedResults.indexOf(resultId);

    if (resultIndex > -1) {
      selectedResults.splice(resultIndex, 1);
    } else {
      selectedResults.push(resultId);
    }

    this.setState((prevState) => ({
      ...prevState,
      selectedResults
    }));
  }

  /**
   * handles download click request for selected result citations
   */
  onClickCitationDownload(results) {
    // gather citations per selected state
    const data = results.map((result) => {
      if (
        result.citation
        && this.state.selectedResults.includes(result.id)
      ) {
        return result.citation;
      }
    });

    downloadToFile({
      data,
      fileName: `obp-export-citations-${new Date().toISOString()}.txt`,
      lineBreak: "\n\n"
    })
  }

  /**
   * shows the select/deselect all link
   * @param {array} results - array of all results
   * @returns 
   */
  renderSelectResultsLink(results) {
    // everything is selected, then render the deselect all link
    if (results.length === this.state.selectedResults.length) {
      return (
        <li className="crumb-tail">
          <a href="#" onClick={() => this.onDeselectAllResults()}>
            Deselect All
          </a>
        </li>
      );
    }

    // default render the select all link
    return (
      <li className="crumb-tail">
        <a href="#" onClick={() => this.onSelectAllResults(results)}>
          Select All
        </a>
      </li>
    );
  }

  /**
   * shows the download citation button
   * @param {array} results - array of all results
   */
  // TODO add tooltip component to the checkbox. Said tooltip component exists in another feature branch, we either need to merge that branch here to wait until its in dev and rebase.
  // feature branch mentioned above: feature/OBP-281/search-field-help-text
  renderDownloadCitationsButton(results) {
    const isEnabled = this.state.selectedResults.length > 0;

    return (
      <li className="crumb-tail">
        <button
          className={`result__button result__button-secondary ${isEnabled ? 'is-active': null}`}
          onClick={() => this.onClickCitationDownload(results)}
          disabled={!isEnabled}
        >
          <span className="result__button-icon"><i className="fa fa-quote-right" aria-hidden="true"></i></span>
          <span>Download Citations</span>
        </button>
      </li>
    );
  }

  render() {

    // Set the results to the current state of the searchReducer state

    let results = this.props.searchReducer.items.map((result) => {
      return {
        date: result._source.issued_date,
        highlight: result.highlight && result.highlight.contents,
        id: result._id,
        language: result._source.language,
        publisher: result._source.publisher,
        author: result._source.author,
        terms: result._source.terms,
        title: result._source.title,
        handle: result._source.handle,
        thumbnail: result._source.thumbnail,
        refereed: result._source.refereed,
        journal_title: result._source.journal_title,
        citation: result._source.citation,
        methodology: Array.isArray(result._source.bptype)
          ? result._source.bptype.join(', ')
          : result._source.bptype,
        uuid: result._source.uuid,
        sourceKey: result._source.sourceKey
      }
    });

    // This will create 100 results based off of the first result. This is for debugging purposes only

    // if (results.length) {
    //   let tempResult = results[0];
    //   results = Array(100).fill(tempResult, 0, 100);
    // }


    // If we have results, map through the results and create an array of the Result components,
    // otherwise, output the "no results" state.

    let resultsItems,
        searchStatus,
        resultsHasStatus = true;

    // This block is what will designate what we are currently displaying in the SearchResults component.
    // There are a few states this could be:
    // has not searched, loading results, display results, display error, or no results
    //
    // resultsHasStatus triggers the "status" view with information about the current status.

    if (this.props.searchReducer.isLoading) {

      // If we are loading a search, show a loading interstitial

      resultsHasStatus = true;

      searchStatus = (
        <SearchStatus status="loading" searchTerm={this.props.searchReducer.activeSearch} />
      )

    } else if (results.length) {

      resultsHasStatus = false;

      resultsItems = results.map((result) => {

        const {
          id,
          date,
          language,
          title,
          publisher,
          author,
          highlight,
          terms,
          handle,
          thumbnail,
          refereed,
          journal_title,
          citation,
          methodology,
          uuid,
          sourceKey
        } = result;

        return <Result
          key={id}
          date={date}
          highlight={highlight}
          id={id}
          language={language ? getLangNameFromCode(language).name : null}
          publisher={publisher}
          author={author}
          title={title}
          terms={terms}
          onSetTerms={this.onSetTerms.bind(this)}
          onResetTerms={this.onResetTerms.bind(this)}
          handle={handle}
          thumbnail={thumbnail}
          refereed={refereed}
          journal_title={journal_title}
          citation={citation}
          methodology={methodology}
          uuid={uuid}
          sourceKey={sourceKey}
          resultSelected={this.state.selectedResults.includes(id)}
          onCheck={this.onSelectOneResult}
        />
      });

    } else {

      if (this.props.searchReducer.hasErrored) {

        resultsHasStatus = true;

        searchStatus = (
          <SearchStatus status="error" />
        )
      } else if (!this.props.searchReducer.hasSearched) {

        resultsHasStatus = true;

        searchStatus = (
          <SearchStatus status="has_not_searched" />
        )
      } else {

        resultsHasStatus = true;

        searchStatus = (
          <SearchStatus status="no_results" searchTerm={this.props.searchReducer.activeSearch} />
        )
      }
    }

    let containerClassName = 'search-results';

    if (resultsHasStatus) {
      containerClassName = 'search-results search-results--has-status';
    }

    return (
      <section className={containerClassName}>
        {
          // Trigger the display of number of results based on the length of results.
          results.length
            ? (
              <header className="search-results__header">
                <span className='search-results__breadcrumbs'>
                  <Superlink to='/' class_name='search-results__breadcrumbs-home' event_category="results" event_action="link" event_label="Home">
                    <li>Home</li>
                  </Superlink>
                  <li><strong>Search OBP</strong></li>
                  {
                    this.renderSelectResultsLink(results)
                  }
                  {
                    this.renderDownloadCitationsButton(results)
                  }
                </span>
                <span className="search-results__sort">
                  <span className='search-results__number'><strong>{ this.props.searchReducer.totalResults } result{ results.length > 1 ? 's' : null }</strong></span>
                  <SearchFilter />
                </span>
              </header>
            )
            : null
        }
        {searchStatus}
        {
          results.length
          ? <section className="search-results__results">
            {resultsItems}
            <SearchPagination
              activePage={this.props.searchReducer.activePage}
              pageCount={this.props.searchReducer.totalResults / defaultQuerySize}
              onSetPage={this.onSetPage.bind(this)}
            />
          </section>
          : null
        }
      </section>
    );
  }
}

export default connect(state => state)(SearchResults);
