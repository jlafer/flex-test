import React from 'react';
import {connect} from 'react-redux';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import {log, setSyncMapItem} from 'jlafer-flex-util';
import {OP_PARTY_READY, TEST_STATUS_PENDING} from 'flex-test-lib';

class TestingDataForm extends React.Component {
  constructor(props) {
    super(props);
    log.debug('TestingDataForm: received props:', props);
    this.onChangeAgent = this.onChangeAgent.bind(this);
    this.onStartTest = this.onStartTest.bind(this);
  }

  onChangeAgent = (event) => this.props.setAgentName(event.target.value);

  onStartTest() {
    const {syncMap, agtName, worker} = this.props;
    this.props.startTest(syncMap, agtName, worker);
  }

  render() {
    const testNotPending = (this.props.testStatus !== TEST_STATUS_PENDING);
    log.debug('TestingDataForm: rendering');
    // TODO need to work on layout and styling
    return (
      <div className="form-group row">
        <Button id="readyBtn" disabled={testNotPending} onClick={this.onStartTest} variant="contained" color="primary" size="small">
          Ready
        </Button>
        <TextField id="agtName" label="Agent Name" value={this.props.agtName || ''} onChange={this.onChangeAgent} variant="outlined" size="small" />
      </div>
    );
  }
}

const startTest = (map, agtName, worker) => {
  const data = {source: agtName, op: OP_PARTY_READY, workerSid: worker.sid, startTime: new Date()};
  setSyncMapItem(map, agtName, data, 300);
};

function mapStateToProps(state) {
  const testingData = state.testingData;
  log.debug('TestingDataForm.mapStateToProps: state.testingData:', testingData);
  const {testStatus, agtName, syncMap, worker} = testingData;
  return {testStatus, agtName, syncMap, worker, startTest};
}

const setAgentName = (agtName) => ({type: 'SET_AGENT_NAME', payload: {agtName}});

export default connect(
  mapStateToProps,
  {setAgentName}
)(TestingDataForm);
