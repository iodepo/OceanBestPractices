import React, { Component } from 'react';

class SearchStatus extends Component {

  render() {

    let status = this.props.status,
        icon = '',
        statusText;

    switch (status) {
      case 'error':
        icon = 'exclamation-triangle';
        statusText = `Uh oh. Looks like something may have gone wrong. Try searching again. If that doesn't work, try refreshing your browser.`;
        break;
      case 'loading':
        icon = 'spinner';
        statusText = `Your search is loading. Hold tight!`;
        break;
      case 'no_results':
        icon = 'times-circle';
        statusText = `Your search returned no results. Try another search term.`;
        break;
      case 'has_not_searched':
        icon = 'search';
        statusText = `Type a term in the above to start your search.`;
        break;
      default:
        return false;
    }

    return (
      <section className="search-status">
        <div className="search-status__info">
          <i className={`fa fa-${icon} search-status__icon`}></i>
          <span className="search-status__text" dangerouslySetInnerHTML={{__html: statusText}}/>
        </div>
      </section>
    )
  }
}

export default SearchStatus;
