import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { TextareaAutosize } from '@material-ui/core';

export default function RequestForm() {
  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>
        Script information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="firstName"
            name="firstName"
            label="First name"
            fullWidth
            autoComplete="fname"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="lastName"
            name="lastName"
            label="Last name"
            fullWidth
            autoComplete="lname"
          />
        </Grid>
        <Grid item xs={12}>
          <TextareaAutosize
            aria-label="maximum height"
            placeholder="Maximum 4 rows"
            defaultValue="goto https://google.com"
            style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: '100%',
              minHeight: '10%'
            }}
          />
        </Grid>
      </Grid>
    </React.Fragment>
  );
}