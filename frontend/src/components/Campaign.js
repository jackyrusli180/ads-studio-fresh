import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Tabs, 
  Tab, 
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';

const Campaign = () => {
  const [tabValue, setTabValue] = useState(0);
  const [campaignType, setCampaignType] = useState('');
  const [campaignStatus, setCampaignStatus] = useState('');
  const [filterType, setFilterType] = useState('Campaign ID');
  const [searchValue, setSearchValue] = useState('');
  
  // Sample campaign data
  const campaigns = [
    { 
      id: '2081', 
      name: 'ID KOL Arbitech Deposit and Trade campaign May 2024', 
      status: 'Draft', 
      type: 'Basic campaign',
      module: 'Campaign data',
      startDate: '2024/05/22 08:00:00',
      endDate: '2024/06/23 07:59:59',
      creator: 'Sh'
    },
    { 
      id: '2080', 
      name: 'Untitled', 
      status: 'Draft', 
      type: 'Basic campaign',
      module: '-',
      startDate: '-',
      endDate: '-',
      creator: 'Jin'
    },
    { 
      id: '2079', 
      name: 'Untitled', 
      status: 'Draft', 
      type: 'Basic campaign',
      module: '-',
      startDate: '-',
      endDate: '-',
      creator: 'Jin'
    },
    { 
      id: '1702', 
      name: 'TR RC test 1', 
      status: 'Published', 
      type: 'Basic campaign',
      module: 'Task',
      startDate: '2024/04/01 14:00:00',
      endDate: '2024/05/31 00:00:00',
      creator: 'Ro'
    },
    { 
      id: '2070', 
      name: 'Cardano Trading competition may', 
      status: 'Published', 
      type: 'Individual competition',
      module: '-',
      startDate: '2024/05/20 08:00:00',
      endDate: '2024/06/04 08:00:00',
      creator: 'Ali'
    },
  ];
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleCampaignTypeChange = (event) => {
    setCampaignType(event.target.value);
  };
  
  const handleCampaignStatusChange = (event) => {
    setCampaignStatus(event.target.value);
  };
  
  const handleFilterTypeChange = (event) => {
    setFilterType(event.target.value);
  };
  
  const handleSearchChange = (event) => {
    setSearchValue(event.target.value);
  };
  
  const handleReset = () => {
    setCampaignType('');
    setCampaignStatus('');
    setSearchValue('');
  };
  
  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h5" component="h1" fontWeight="500">
          User campaigns
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          sx={{ 
            bgcolor: '#000', 
            '&:hover': { bgcolor: '#333' },
            borderRadius: '4px'
          }}
        >
          Create campaign
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage campaigns
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Active" />
            <Tab label="Archived" />
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Typography variant="subtitle1">Campaign type</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={campaignType}
                  onChange={handleCampaignTypeChange}
                  displayEmpty
                  renderValue={value => value || "Select"}
                  sx={{ borderRadius: '4px' }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="basic">Basic campaign</MenuItem>
                  <MenuItem value="competition">Competition</MenuItem>
                  <MenuItem value="task">Task campaign</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Typography variant="subtitle1">Campaign status</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={campaignStatus}
                  onChange={handleCampaignStatusChange}
                  displayEmpty
                  renderValue={value => value || "Select"}
                  sx={{ borderRadius: '4px' }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="ended">Ended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Typography variant="subtitle1">Filter type</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filterType}
                  onChange={handleFilterTypeChange}
                  sx={{ borderRadius: '4px' }}
                >
                  <MenuItem value="Campaign ID">Campaign ID</MenuItem>
                  <MenuItem value="Campaign Name">Campaign Name</MenuItem>
                  <MenuItem value="Creator">Creator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Typography variant="subtitle1">&nbsp;</Typography>
              <TextField
                fullWidth
                placeholder="Search"
                size="small"
                value={searchValue}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: '4px' }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={handleReset}
              sx={{ mr: 1, borderColor: '#e0e0e0', color: '#000' }}
            >
              Reset
            </Button>
            <Button 
              variant="contained"
              sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
            >
              Search
            </Button>
          </Box>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Campaign modules</TableCell>
                <TableCell>Campaign start date</TableCell>
                <TableCell>Campaign end date</TableCell>
                <TableCell>Creator</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow 
                  key={campaign.id} 
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                  }}
                >
                  <TableCell>{campaign.id}</TableCell>
                  <TableCell sx={{ color: '#0066cc', cursor: 'pointer' }}>
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={campaign.status} 
                      size="small" 
                      color={campaign.status === 'Published' ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ borderRadius: '4px' }}
                    />
                  </TableCell>
                  <TableCell>{campaign.type}</TableCell>
                  <TableCell>{campaign.module}</TableCell>
                  <TableCell>{campaign.startDate}</TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                  <TableCell>{campaign.creator}</TableCell>
                  <TableCell align="center">
                    <Box 
                      component="span" 
                      sx={{ 
                        color: '#0066cc', 
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <span>Show</span>
                      <ArrowDropDownIcon />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderTop: '1px solid #e0e0e0'
        }}>
          <Typography variant="body2" color="text.secondary">
            Total: 393 items
          </Typography>
          <Pagination count={10} shape="rounded" />
        </Box>
      </Paper>
    </Box>
  );
};

export default Campaign; 