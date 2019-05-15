import React, { Component } from "react";

const maxPagesAround = 3;

class SearchPagination extends Component {

  constructor(props) {

    super();

    // Create a range property and fill it with one item for every page. This is used below so we can
    // map through and create the pagination items

    this.range = [];

    for (var i = 0; i < props.pageCount; i++) {
      this.range.push(i);
    }

    this.setPage = this.setPage.bind(this);

  }

  setPage(page) {
    switch (page) {
      case 'first':
        this.props.onSetPage(0);
        break;
      case 'last':
        this.props.onSetPage(this.range.pop());
        break;
      default:
        this.props.onSetPage(page);
    }
  }

  render() {

    if ( this.range.length === 1 ) {
      return null;
    }

    let hasSkippedBelow = false;
    let hasSkippedAbove = false;

    return (
      <section className="search-pagination">
        <ul className="search-pagination__list">
          <li className="search-pagination__item">
            <button type="button" className="search-pagination__button" onClick={() => {this.setPage('first')}}>First</button>
          </li>
          {
            this.range.map((i) => {

              // First lets see if we should be skipping any of the pages. This is all based around the maxPagesAround variable,
              // and will skip that many items above and below, and replace them with an ellipisis

              const shouldSkipPageBelow = i < (this.props.activePage - 1) - maxPagesAround;
              const shouldSkipPageAbove = i > (this.props.activePage - 1) + maxPagesAround;

              if (shouldSkipPageBelow) {

                if (!hasSkippedBelow) {

                  hasSkippedBelow = true;
                  return (
                    <li key={i.toString()} className="search-pagination__item search-pagination__item--elipsis">...</li>
                  )
                }

                return null;
              }

              if (shouldSkipPageAbove) {

                if (!hasSkippedAbove) {

                  hasSkippedAbove = true;
                  return (
                    <li key={i.toString()} className="search-pagination__item search-pagination__item--elipsis">...</li>
                  )
                }

                return null;
              }

              // If we get here, we can output a normal pagination button for the page below

              const isCurrent = i === this.props.activePage - 1;

              let buttonClassName = 'search-pagination__button';

              buttonClassName = isCurrent ? `${buttonClassName} search-pagination__button--is-active` : buttonClassName;

              const onClick = ev => {
                ev.preventDefault();
                this.setPage(i);
              };

              return (
                <li key={i.toString()} className="search-pagination__item">
                  <button type="button" className={buttonClassName} onClick={onClick}>{i + 1}</button>
                </li>
              )
            })
          }
          <li className="search-pagination__item">
            <button type="button" className="search-pagination__button" onClick={() => {this.setPage('last')}}>Last</button>
          </li>
        </ul>
      </section>
    )
  }
}

export default SearchPagination;
