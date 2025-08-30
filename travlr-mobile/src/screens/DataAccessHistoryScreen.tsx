import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimelineItemProps {
  title: string;
  date: string;
  avatar: string;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ title, date, avatar, isLast = false }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      <Image source={{ uri: avatar }} style={styles.timelineAvatar} />
      {!isLast && <View style={styles.timelineLine} />}
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineDate}>{date}</Text>
    </View>
  </View>
);

interface CompanyItemProps {
  name: string;
  logo: string;
  isActive: boolean;
}

const CompanyItem: React.FC<CompanyItemProps> = ({ name, logo, isActive }) => (
  <View style={styles.companyItem}>
    <View style={styles.companyLeft}>
      <Image source={{ uri: logo }} style={styles.companyLogo} />
      <Text style={styles.companyName}>{name}</Text>
    </View>
    <View style={styles.companyRight}>
      <View style={[styles.statusDot, { backgroundColor: isActive ? '#078812' : '#9b844b' }]} />
    </View>
  </View>
);

interface FilterButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DataAccessHistoryScreen: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('This Week');

  const timelineData = [
    {
      title: 'Flight & Hotel preferences',
      date: 'July 26, 2024, 2:30 PM',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4i9lk9ltzTvLqT1FXEIOsbvubKL806L9AuvhOxWTw_T_-MGYkWTz6j3a-HrsjWcpgJ-5Oex3cwYWd59_24qaAHoDJeosavt0q-3IiTRvIaVAuKhpUJ7C2oziIQMmpiaXJ9CZJ_fEkvPaVDMUhKkH0UalYL-BrDO-_Mc4QsHsGcxeaDP41eBlADqrGWV-1gWQCcvD584BudKZ5PKffkKrowcDKsVLdnv-IaO3vah9YuCIqKkMlOFM-nONy0r7t0JgXzevekjQDff1m',
    },
    {
      title: 'Employee Information',
      date: 'July 25, 2024, 10:15 AM',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMCN4bOd6OmU9OK5VSSiIKsPQFzPkuErqtDZIESRkKwCgNSl_BUjz4hzMUMUfNzIym-wd1zSGU6J9KaIYiG3IOltC0dmWivbi3CJIs59AMI02u0zvazwmGS0avsUGmvR5FXRk8zSJ1447hsxVg7Cq1-cq7EA4QNF8mwb89_xOmCUu4iun1OjBmhr_CwpCPEGTlMcY13Bz0IBCepyWrQKH99ds2KEyqyRytx09nwi5NIXzRTD35G99tsMsTc2_7v_kpFxK-DylBEe7t',
    },
    {
      title: 'Flight & Hotel preferences',
      date: 'July 24, 2024, 4:45 PM',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAR8xW0ozDucxxisx3BapgfUCKRcCgSSeNPhAs3rlqddNh_g7jNF_N3-L4VQR7GINZcQ01O_bNrgUpA7iomxpSqo58yKsftipTqyGMdcYaHkhrLsj_tTDMaBZLZzqZy3ASURtJMb99A1PzKEaLQCnIAWEGYh3rrXaBQ6ud3vJUBqu9cC3hozv5noxp9_uYt5MSMY8Xs3TXLc3zahxc2qZZwQiJZDhgMUo4ENPo6eUdZ8ZhvX0ijy-shh_v7QgbDPupHryvS7HG7xNjm',
    },
  ];

  const companyData = [
    {
      name: 'Expedia',
      logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1tfDjNZknQNqbcGCse0H7ugrrN5H9dw7usWxbVdOr1vxoSjec5Bmw1y8nvjhwImJA-zT_q_U3CAVqx_Qyw7lc9N-CoKnGNPdGih1S5OUG2kIhjXyCB6tn7ah2lQZdZr5d3Mbh8ftE4Lyw6zCg-ZTotFAFVjkGbVrPkAwUMLY-DgZ4ViUqAU0bgtCq2uY5rARBiGsWItzjhY9hfPIXA4hnViqF9YlnwyYSXv4XGafay35e4nR-vQt9gmweIAr-eBM6wB0DvbM8bUeP',
      isActive: true,
    },
    {
      name: 'TripAdvisor',
      logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1ZmRUMv0YJE9GM4r-N4URnzu13lxmKyGTsnnmpkS9CIXzrXdr5BWMgXdnDSS8rXIBEA-wh8aYxghukH3i2EubYnYadrdmE4e-E10J3Cga22ij7vKcDtKbDRWK_MeMKP-uLqRs37bR9hDE84uoAB-oQ64z_jhqSDPpG0spfsUABlo_U5RSPg19zbP14j2JX-9jRDhUCpUEY3JUDilUmwqJ-50mUKb8d_O-_OyYEzSY2YcAdxUnyvS7diSyefdocSH5BT3ax4ikunnl',
      isActive: true,
    },
    {
      name: 'Booking.com',
      logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA5Sqc-l7GJZJa-0GAggHONaGFmFdzaVYIGqQNHL9KG8RgU42LylqqsvDwuX3Ymuh-27Az2H11I0SIMqnm2rmFanuL1Ssm9U8DraUiHbjHkqdE2aA1VBo6lLojr2Z5XuNKtSotFXTnJIIAflhVk1FXnP4bGfqU-_0KXnPPXnhEL0hhpu2_9K5_Fnhd6n8ADgmkTRRW-HlPUgVozBHsrSMcKwqq01dkVvCCNsBg3u0OLRrcFZ5O8WmfesqfyeKt3QSFAYy0RZAR7WQS',
      isActive: true,
    },
  ];

  const filterOptions = ['Today', 'This Week', 'This Month'];

  const handleBack = () => {
    console.log('Back pressed');
    // Navigate back to previous screen
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    console.log(`Filter changed to: ${filter}`);
    // Filter the data based on selected time period
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c170d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Who Accessed Your Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <View style={styles.filterButtonGroup}>
          {filterOptions.map((option) => (
            <FilterButton
              key={option}
              label={option}
              isSelected={selectedFilter === option}
              onPress={() => handleFilterChange(option)}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {timelineData.map((item, index) => (
            <TimelineItem
              key={index}
              title={item.title}
              date={item.date}
              avatar={item.avatar}
              isLast={index === timelineData.length - 1}
            />
          ))}
        </View>

        {/* Companies with Access */}
        <View style={styles.companiesContainer}>
          {companyData.map((company, index) => (
            <CompanyItem
              key={index}
              name={company.name}
              logo={company.logo}
              isActive={company.isActive}
            />
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  headerSpacer: {
    width: 48,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#f3f0e7',
    borderRadius: 8,
    padding: 4,
    height: 40,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#fcfbf8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9b844b',
  },
  filterButtonTextSelected: {
    color: '#1c170d',
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    paddingTop: 12,
  },
  timelineAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timelineLine: {
    width: 1.5,
    backgroundColor: '#e8e1cf',
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingVertical: 12,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 16,
    color: '#9b844b',
  },
  companiesContainer: {
    paddingTop: 16,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  companyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
  },
  companyName: {
    fontSize: 16,
    color: '#1c170d',
    flex: 1,
  },
  companyRight: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default DataAccessHistoryScreen;