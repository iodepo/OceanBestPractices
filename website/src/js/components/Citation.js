import React, { Component } from "react";

class Citation extends Component {
  render() {
    return (
      <section className="citation">
          {this.props.citation}
      </section>
    );
  }
}

export default Citation;