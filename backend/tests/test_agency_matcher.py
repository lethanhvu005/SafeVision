from backend.app.models.agency import Agency
from backend.app.services.agency_matcher import AgencyMatcher


def test_match_default_when_no_location():
    agencies = [Agency(region_code='DEFAULT', region_name='Default', agency_name='Default Agency', email='default@example.com', phone='000', is_default=True, is_active=True)]
    result = AgencyMatcher.match(None, None, agencies)
    assert result.region_code == 'DEFAULT'


def test_match_bbox():
    agencies = [
        Agency(region_code='HCM', region_name='TPHCM', agency_name='HCM Agency', email='hcm@example.com', phone='000', lat_min=10.0, lat_max=11.0, lon_min=106.0, lon_max=107.0, is_active=True),
        Agency(region_code='DEFAULT', region_name='Default', agency_name='Default Agency', email='default@example.com', phone='000', is_default=True, is_active=True),
    ]
    result = AgencyMatcher.match(10.7, 106.7, agencies)
    assert result.region_code == 'HCM'
