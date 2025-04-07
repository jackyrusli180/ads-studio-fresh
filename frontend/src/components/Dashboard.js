import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon,
  Campaign as CampaignIcon,
  Person as UserIcon,
  ShoppingCart as LeadsIcon,
  Insights as AnalyticsIcon
} from '@mui/icons-material';

const Dashboard = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Sample campaign data
  const campaigns = [
    { 
      id: '2081', 
      name: 'Deposit and Trade campaign May 2024', 
      status: 'Draft', 
      type: 'Basic campaign',
      module: 'Campaign data',
      startDate: '2024/05/22 08:00:00',
      endDate: '2024/06/23 07:59:59',
      creator: 'Sh'
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
      name: 'Trading competition may', 
      status: 'Published', 
      type: 'Individual competition',
      module: '-',
      startDate: '2024/05/20 08:00:00',
      endDate: '2024/06/04 08:00:00',
      creator: 'Al'
    }
  ];

  // Sample leads data
  const leads = [
    {
      name: 'test_lead',
      owner: 'Felix Vo',
      status: 'Application Submitted',
      createDate: '2024-02-08 18:13:54',
      lastUpdate: '2024-05-17 16:11:11'
    },
    {
      name: 'fangzhou test 20240229',
      owner: 'Felix Vo',
      status: 'Rejected',
      createDate: '2024-02-29 19:58:04',
      lastUpdate: '2024-05-17 16:10:01'
    },
    {
      name: 'jialerktest4',
      owner: 'Felix Vo',
      status: 'Archived',
      createDate: '2024-05-02 15:46:15',
      lastUpdate: '2024-05-17 15:23:22'
    }
  ];

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h5" component="h1" fontWeight="500">
          Dashboard
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CampaignIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Campaigns</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                24
              </Typography>
              <Typography variant="body2" color="text.secondary">
                5 active campaigns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UserIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Users</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                1,245
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +12% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LeadsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Leads</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                79
              </Typography>
              <Typography variant="body2" color="text.secondary">
                14 waiting for contact
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Engagement Rate</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                24.8%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +3.2% from last week
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Campaigns Section */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6">Recent Campaigns</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            sx={{ 
              bgcolor: '#000', 
              '&:hover': { bgcolor: '#333' }
            }}
          >
            Create Campaign
          </Button>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="campaign tabs">
            <Tab label="Active" />
            <Tab label="Archived" />
          </Tabs>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Campaign modules</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Creator</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id} hover>
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
                    />
                  </TableCell>
                  <TableCell>{campaign.type}</TableCell>
                  <TableCell>{campaign.module}</TableCell>
                  <TableCell>{campaign.startDate}</TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                  <TableCell>{campaign.creator}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Leads Section */}
      <Paper>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6">Recent Leads</Typography>
          <Button 
            variant="outlined" 
            color="primary"
            sx={{ borderColor: '#000', color: '#000' }}
          >
            View All
          </Button>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Lead Name</TableCell>
                <TableCell>Lead Owner</TableCell>
                <TableCell>Lead Status</TableCell>
                <TableCell>Create Date</TableCell>
                <TableCell>Last Update Date</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.name} hover>
                  <TableCell sx={{ color: '#0066cc', cursor: 'pointer' }}>
                    {lead.name}
                  </TableCell>
                  <TableCell>{lead.owner}</TableCell>
                  <TableCell>
                    <Chip 
                      label={lead.status} 
                      size="small" 
                      color={
                        lead.status === 'Application Submitted' ? 'info' : 
                        lead.status === 'Rejected' ? 'error' : 
                        'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{lead.createDate}</TableCell>
                  <TableCell>{lead.lastUpdate}</TableCell>
                  <TableCell sx={{ color: '#0066cc' }}>View</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard; 