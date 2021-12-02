/**
 * downloads array of data to plain text, or other preferred format
 * @param {Array} [data=[]] - data to be formatted as text or specified fileType
 * @param {string} [fileName="exportDataToPlainText.txt"] - sets the file name to be downloaded, should include file extension if applicable
 * @param {string} [fileType="text/plain"] - sets the file type, defaults to "text/plain"
 * @param {string} [lineBreak="\n"] - sets the character for the line break, defaults to "\n"
 */
 export const downloadToFile = ({
  data = [],
  fileName = "exportDataToPlainText.txt",
  fileType = "text/plain",
  lineBreak = "\n"
}) => {
  const dataBlob = new Blob([[...data].join(lineBreak)], {
    type: fileType
  });

  // create a dom element to trigger the download
  const hiddenLink = document.createElement("a");
  hiddenLink.download = fileName;
  hiddenLink.href = window.URL.createObjectURL(dataBlob);
  const clickEvt = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true
  });
  hiddenLink.dispatchEvent(clickEvt);

  // cleanup the dom element when finished
  hiddenLink.remove();
};