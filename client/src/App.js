import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useRouteMatch,
  useParams
} from 'react-router-dom';
import Nav from './nav';
import Requests from './pages/Requests';
import Results from './pages/Results';

function App() {
  return (
    <Router>
      <Switch>
        <Nav>
          <Route path="/requests">
            <Requests />
          </Route>
          <Route path="/results">
            <Results />
          </Route>
        </Nav>
      </Switch>
    </Router>
  );
}

export default App;
