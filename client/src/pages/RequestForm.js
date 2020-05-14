import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { TextareaAutosize } from '@material-ui/core';

export default function RequestForm({firstName, setFirstName, lastName, setLastName, code, setCode}) {
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
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
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
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextareaAutosize
            aria-label="maximum height"
            value={code}
            onChange={e => setCode(e.target.value)}
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