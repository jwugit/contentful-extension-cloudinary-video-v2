import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { TextField, Button } from '@contentful/forma-36-react-components';
import { init } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';
import {Video, Transformation} from 'cloudinary-react';

export class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  detachExternalChangeHandler = null;

  constructor(props) {
    super(props);
    this.state = {
      action: '',
      list: []
    };
  }

  componentDidMount() {
    const {cloud_name, preset} = this.props.sdk.parameters.instance

    window.cuw = window.cloudinary.createUploadWidget({
        cloudName: cloud_name,
        resourceType: 'video',
        clientAllowedFormats: ['mp4', 'WebM', 'FLV', 'MOV', 'OGV', '3GP', '3G2', 'WMV', 'MPEG', 'FLV', 'MKV', 'AVI'],
        inlineContainer: '.widget-container',
        uploadPreset: preset}, (error, result) => {
        if (!error && result && result.event === "success") {
          console.log('Done! Here is the image info: ', result.info);
        }
      }
    )

    this.props.sdk.window.startAutoResizer();

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(this.onExternalChange);
  }

  componentWillUnmount() {
    if (this.detachExternalChangeHandler) {
      this.detachExternalChangeHandler();
    }
  }

  tryJsonParse = (text) => {
    try {
      return JSON.parse(text)
    } catch (e) {
      return ""
    }
  }

  onExternalChange = value => {
    this.setState({ value: this.tryJsonParse(value) });
  };

  handleClose = () => {
    this.setState({action: 'close'})
  }
  handleReset = () => {
    this.props.sdk.field.removeValue().then(() => {
      this.setState({action: 'reset'})
    });
  }

  handleUpload = () => {
    window.cuw.open();
    this.setState({action: 'upload'})
  }

  handleSelect = () => {
    const {cloud_name, tag} = this.props.sdk.parameters.instance

    const cloudApiUrl = `https://res.cloudinary.com/${cloud_name}/video/list/${tag}.json`

    fetch(cloudApiUrl).then(res => res.json()).then(data => {
      this.setState({action: 'select', list: data})
    }).catch(() => {
      console.log('failed to fetch')
      this.setState({action: 'error', errMsg: 'failed to find videos in cloudinary',  list: []})
    })
  }

  handleSelectSingle = (cloudValue) => {
    this.setState({action: 'single'})
    this.props.sdk.field.setValue(JSON.stringify(cloudValue));
  }

  render() {
    const {cloud_name, tag, preset} = this.props.sdk.parameters.instance;
    if(!(!!cloud_name && !!tag && !!preset)) {
      return <div>Error: not configured properly, please contact your space admin</div>
    }
    const {action, errMsg, list} = this.state
    const cloudValue = this.props.sdk.field.getValue() || ''
    let cloudValueJSON = this.tryJsonParse(cloudValue)
    let public_id = (cloudValueJSON && cloudValueJSON.public_id) || ''

    return (
      <div>
        <TextField
          name="selectedFile"
          id="selectedFile"
          labelText="Selected Video"
          value={public_id}
          textInputProps={{
            disabled: true,
          }}
        />
        {!!public_id && <div className="showPreview">
          <Video cloudName={cloud_name} publicId={public_id} controls>
            <Transformation width="300" height="200" crop="fit" />
          </Video>
          <Button className="btnControl" buttonType="primary" onClick={this.handleReset}>Remove</Button>
        </div>}
        <br />

        {!public_id && <Button className="btnControl" buttonType="primary" onClick={this.handleUpload}>Upload New Video</Button>}
        {!public_id && <Button className="btnControl" buttonType="primary" onClick={this.handleSelect}>Select from Video List</Button>}
        {!public_id && (action === 'select' || action === 'upload') && <Button className="btnControl" buttonType="primary" onClick={this.handleClose}>Close</Button>}

        {action === 'select' &&  list && Array.isArray(list.resources) && <div className="vidList">
          {list.resources.map(r => {
            return <div key={r.public_id}>
              <Video cloudName={cloud_name} publicId={r.public_id} controls>
                <Transformation width="300" height="200" crop="fit" />
              </Video>
              <div className="vidName">{r.public_id}</div>
              <Button buttonType="primary" onClick={() => this.handleSelectSingle(r)}>Select Video</Button>
            </div>
          })}
        </div>}
        {action === 'error' && <div>
          {errMsg}
        </div>}
        <div className="widget-container" style={{display: (action === 'upload' ? 'flex' : 'none')}}/>
      </div>
    );
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
