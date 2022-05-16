import React, { Component } from "react";
import iodeLogo from '../../images/iode-logo-footer.png';
import goosLogo from '../../images/goos-logo-footer.png';
import FullScreenModal from './FullScreenModal';
import PoweredByE84 from '../../images/PoweredByE84.svg';
import FooterLinks from './FooterLinks';
import Superlink from './Superlink';
import Disclaimer from './Disclaimer';

class Footer extends Component {

  render() {

    let footer_links = null;

    if ( this.props.footerLinks ) {
      footer_links = <FooterLinks />
    }

    return (
      <footer className="footer">
        <section className="footer__info">
        <div className="footer__logos">
            <Superlink to="https://iode.org" target="_blank" event_category="footer" event_action="link" event_label="IODE Logo">
              <img className="footer__iode-logo"src={iodeLogo} alt="IODE Logo"/>
            </Superlink>
            <Superlink to="https://goosocean.org" target="_blank" event_category="footer" event_action="link" event_label="GOOS Logo">
              <img className="footer__goos-logo"src={goosLogo} alt="GOOS Logo" height="23px"/>
            </Superlink>
          </div>
          <span className="footer__text">&copy; {(new Date().getFullYear())}. UNESCO/IOC Project office for <a className="footer__link" href="https://www.iode.org">IODE</a> Oostende, Belgium.</span>

        </section>

        <section className="footer__credits">
          <Superlink to="https://element84.com" target="_blank" event_category="footer" event_action="link" event_label="Powered by Element 84">
            <img src={PoweredByE84} alt="Powered by Element 84" />
          </Superlink>
        </section>

        <section className='footer__legal'>
        { footer_links }
        <div className='footer-links'>
            <span>
              <FullScreenModal modalCTA='Disclaimer' modalTitle='Disclaimer' modalClass='footer-modal' location="footer">
                <Disclaimer />
              </FullScreenModal>
            </span>
          </div>
        </section>
      </footer>
    );

  }

}

export default Footer;
