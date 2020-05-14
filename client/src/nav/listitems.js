import React from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import BarChartIcon from '@material-ui/icons/BarChart';
import LayersIcon from '@material-ui/icons/Layers';
import PlusOne from '@material-ui/icons/PlusOne';
import { Link } from 'react-router-dom';

export const mainListItems = (
  <div>
    <ListItem button component={Link} to='/requests'>
      <ListItemIcon>
        <PlusOne />
      </ListItemIcon>
      <ListItemText primary="Request" />
    </ListItem>
    <ListItem button component={Link} to='/results'>
      <ListItemIcon>
        <LayersIcon />
      </ListItemIcon>
      <ListItemText primary="Results" />
    </ListItem>
  </div>
);
