import csv

# Full list of 245 entries (Country Name, Alpha-2 Code)
countries = [
    ("Afghanistan", "AF"),
    ("Åland Islands", "AX"),
    ("Albania", "AL"),
    ("Algeria", "DZ"),
    ("American Samoa", "AS"),
    ("Andorra", "AD"),
    ("Angola", "AO"),
    ("Anguilla", "AI"),
    ("Antarctica", "AQ"),
    ("Antigua and Barbuda", "AG"),
    ("Argentina", "AR"),
    ("Armenia", "AM"),
    ("Aruba", "AW"),
    ("Australia", "AU"),
    ("Austria", "AT"),
    ("Azerbaijan", "AZ"),
    ("Bahamas", "BS"),
    ("Bahrain", "BH"),
    ("Bangladesh", "BD"),
    ("Barbados", "BB"),
    ("Belarus", "BY"),
    ("Belgium", "BE"),
    ("Belize", "BZ"),
    ("Benin", "BJ"),
    ("Bermuda", "BM"),
    ("Bhutan", "BT"),
    ("Bolivia", "BO"),
    ("Bonaire, Sint Eustatius and Saba", "BQ"),
    ("Bosnia and Herzegovina", "BA"),
    ("Botswana", "BW"),
    ("Bouvet Island", "BV"),
    ("Brazil", "BR"),
    ("British Indian Ocean Territory", "IO"),
    ("Brunei Darussalam", "BN"),
    ("Bulgaria", "BG"),
    ("Burkina Faso", "BF"),
    ("Burundi", "BI"),
    ("Cabo Verde", "CV"),
    ("Cambodia", "KH"),
    ("Cameroon", "CM"),
    ("Canada", "CA"),
    ("Cayman Islands", "KY"),
    ("Central African Republic", "CF"),
    ("Chad", "TD"),
    ("Chile", "CL"),
    ("China", "CN"),
    ("Christmas Island", "CX"),
    ("Cocos (Keeling) Islands", "CC"),
    ("Colombia", "CO"),
    ("Comoros", "KM"),
    ("Congo", "CG"),
    ("Congo, Democratic Republic of the", "CD"),
    ("Cook Islands", "CK"),
    ("Costa Rica", "CR"),
    ("Croatia", "HR"),
    ("Cuba", "CU"),
    ("Curaçao", "CW"),
    ("Cyprus", "CY"),
    ("Czechia", "CZ"),
    ("Denmark", "DK"),
    ("Djibouti", "DJ"),
    ("Dominica", "DM"),
    ("Dominican Republic", "DO"),
    ("Ecuador", "EC"),
    ("Egypt", "EG"),
    ("El Salvador", "SV"),
    ("Equatorial Guinea", "GQ"),
    ("Eritrea", "ER"),
    ("Estonia", "EE"),
    ("Eswatini", "SZ"),
    ("Ethiopia", "ET"),
    ("Falkland Islands (Malvinas)", "FK"),
    ("Faroe Islands", "FO"),
    ("Fiji", "FJ"),
    ("Finland", "FI"),
    ("France", "FR"),
    ("French Guiana", "GF"),
    ("French Polynesia", "PF"),
    ("French Southern Territories", "TF"),
    ("Gabon", "GA"),
    ("Gambia", "GM"),
    ("Georgia", "GE"),
    ("Germany", "DE"),
    ("Ghana", "GH"),
    ("Gibraltar", "GI"),
    ("Greece", "GR"),
    ("Greenland", "GL"),
    ("Grenada", "GD"),
    ("Guadeloupe", "GP"),
    ("Guam", "GU"),
    ("Guatemala", "GT"),
    ("Guernsey", "GG"),
    ("Guinea", "GN"),
    ("Guinea-Bissau", "GW"),
    ("Guyana", "GY"),
    ("Haiti", "HT"),
    ("Heard Island and McDonald Islands", "HM"),
    ("Holy See", "VA"),
    ("Honduras", "HN"),
    ("Hong Kong", "HK"),
    ("Hungary", "HU"),
    ("Iceland", "IS"),
    ("India", "IN"),
    ("Indonesia", "ID"),
    ("Iran (Islamic Republic of)", "IR"),
    ("Iraq", "IQ"),
    ("Ireland", "IE"),
    ("Isle of Man", "IM"),
    ("Israel", "IL"),
    ("Italy", "IT"),
    ("Jamaica", "JM"),
    ("Japan", "JP"),
    ("Jersey", "JE"),
    ("Jordan", "JO"),
    ("Kazakhstan", "KZ"),
    ("Kenya", "KE"),
    ("Kiribati", "KI"),
    ("Korea (Democratic People's Republic of)", "KP"),
    ("Korea, Republic of", "KR"),
    ("Kuwait", "KW"),
    ("Kyrgyzstan", "KG"),
    ("Lao People's Democratic Republic", "LA"),
    ("Latvia", "LV"),
    ("Lebanon", "LB"),
    ("Lesotho", "LS"),
    ("Liberia", "LR"),
    ("Libya", "LY"),
    ("Liechtenstein", "LI"),
    ("Lithuania", "LT"),
    ("Luxembourg", "LU"),
    ("Macao", "MO"),
    ("Madagascar", "MG"),
    ("Malawi", "MW"),
    ("Malaysia", "MY"),
    ("Maldives", "MV"),
    ("Mali", "ML"),
    ("Malta", "MT"),
    ("Marshall Islands", "MH"),
    ("Martinique", "MQ"),
    ("Mauritania", "MR"),
    ("Mauritius", "MU"),
    ("Mayotte", "YT"),
    ("Mexico", "MX"),
    ("Micronesia (Federated States of)", "FM"),
    ("Moldova (Republic of)", "MD"),
    ("Monaco", "MC"),
    ("Mongolia", "MN"),
    ("Montenegro", "ME"),
    ("Montserrat", "MS"),
    ("Morocco", "MA"),
    ("Mozambique", "MZ"),
    ("Myanmar", "MM"),
    ("Namibia", "NA"),
    ("Nauru", "NR"),
    ("Nepal", "NP"),
    ("Netherlands", "NL"),
    ("New Caledonia", "NC"),
    ("New Zealand", "NZ"),
    ("Nicaragua", "NI"),
    ("Niger", "NE"),
    ("Nigeria", "NG"),
    ("Niue", "NU"),
    ("Norfolk Island", "NF"),
    ("North Macedonia", "MK"),
    ("Northern Mariana Islands", "MP"),
    ("Norway", "NO"),
    ("Oman", "OM"),
    ("Pakistan", "PK"),
    ("Palau", "PW"),
    ("Palestine, State of", "PS"),
    ("Panama", "PA"),
    ("Papua New Guinea", "PG"),
    ("Paraguay", "PY"),
    ("Peru", "PE"),
    ("Philippines", "PH"),
    ("Pitcairn", "PN"),
    ("Poland", "PL"),
    ("Portugal", "PT"),
    ("Puerto Rico", "PR"),
    ("Qatar", "QA"),
    ("Réunion", "RE"),
    ("Romania", "RO"),
    ("Russian Federation", "RU"),
    ("Rwanda", "RW"),
    ("Saint Barthélemy", "BL"),
    ("Saint Helena, Ascension and Tristan da Cunha", "SH"),
    ("Saint Kitts and Nevis", "KN"),
    ("Saint Lucia", "LC"),
    ("Saint Martin (French part)", "MF"),
    ("Saint Pierre and Miquelon", "PM"),
    ("Saint Vincent and the Grenadines", "VC"),
    ("Samoa", "WS"),
    ("San Marino", "SM"),
    ("Sao Tome and Principe", "ST"),
    ("Saudi Arabia", "SA"),
    ("Senegal", "SN"),
    ("Serbia", "RS"),
    ("Seychelles", "SC"),
    ("Sierra Leone", "SL"),
    ("Singapore", "SG"),
    ("Sint Maarten (Dutch part)", "SX"),
    ("Slovakia", "SK"),
    ("Slovenia", "SI"),
    ("Solomon Islands", "SB"),
    ("Somalia", "SO"),
    ("South Africa", "ZA"),
    ("South Georgia and the South Sandwich Islands", "GS"),
    ("South Sudan", "SS"),
    ("Spain", "ES"),
    ("Sri Lanka", "LK"),
    ("Sudan", "SD"),
    ("Suriname", "SR"),
    ("Svalbard and Jan Mayen", "SJ"),
    ("Sweden", "SE"),
    ("Switzerland", "CH"),
    ("Syrian Arab Republic", "SY"),
    ("Taiwan, Province of China", "TW"),
    ("Tajikistan", "TJ"),
    ("Tanzania, United Republic of", "TZ"),
    ("Thailand", "TH"),
    ("Timor-Leste", "TL"),
    ("Togo", "TG"),
    ("Tokelau", "TK"),
    ("Tonga", "TO"),
    ("Trinidad and Tobago", "TT"),
    ("Tunisia", "TN"),
    ("Turkey", "TR"),
    ("Turkmenistan", "TM"),
    ("Turks and Caicos Islands", "TC"),
    ("Tuvalu", "TV"),
    ("Uganda", "UG"),
    ("Ukraine", "UA"),
    ("United Arab Emirates", "AE"),
    ("United Kingdom of Great Britain and Northern Ireland", "GB"),
    ("United States of America", "US"),
    ("Uruguay", "UY"),
    ("Uzbekistan", "UZ"),
    ("Vanuatu", "VU"),
    ("Venezuela (Bolivarian Republic of)", "VE"),
    ("Viet Nam", "VN"),
    ("Western Sahara", "EH"),
    ("Yemen", "YE"),
    ("Zambia", "ZM"),
    ("Zimbabwe", "ZW")
]

# Define sets for each region (based on common geographical groupings)
north_america = {
    "Antigua and Barbuda", "Anguilla", "Bahamas", "Barbados", "Bermuda", "Belize",
    "Canada", "Cayman Islands", "Costa Rica", "Cuba", "Dominica", "Dominican Republic",
    "El Salvador", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica",
    "Martinique", "Mexico", "Montserrat", "Nicaragua", "Panama", "Puerto Rico",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Martin (French part)",
    "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Trinidad and Tobago",
    "United States of America", "Aruba", "Bonaire, Sint Eustatius and Saba", "Curaçao",
    "Sint Maarten (Dutch part)"
}

europe = {
    "Åland Islands", "Albania", "Andorra", "Austria", "Belarus", "Belgium",
    "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
    "Estonia", "Faroe Islands", "Finland", "France", "Germany", "Gibraltar",
    "Greece", "Guernsey", "Hungary", "Iceland", "Ireland", "Isle of Man", "Italy",
    "Jersey", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
    "Moldova (Republic of)", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
    "Norway", "Poland", "Portugal", "Romania", "Russian Federation", "San Marino",
    "Serbia", "Slovakia", "Slovenia", "Spain", "Svalbard and Jan Mayen", "Sweden",
    "Switzerland", "Ukraine", "United Kingdom of Great Britain and Northern Ireland",
    "Holy See"
}

# For Asia we include those that are not usually considered part of the Middle East.
asia = {
    "Afghanistan", "Bangladesh", "Bhutan", "Brunei Darussalam", "Cambodia", "China",
    "Georgia", "Hong Kong", "India", "Indonesia", "Japan", "Kazakhstan", "Kyrgyzstan",
    "Lao People's Democratic Republic", "Macao", "Malaysia", "Maldives", "Mongolia",
    "Myanmar", "Nepal", "Pakistan", "Philippines", "Singapore", "Sri Lanka", "Tajikistan",
    "Timor-Leste", "Turkmenistan", "Uzbekistan", "Viet Nam", "Taiwan, Province of China"
}

middle_east = {
    "Bahrain", "Iran (Islamic Republic of)", "Iraq", "Israel", "Jordan", "Kuwait",
    "Lebanon", "Oman", "Palestine, State of", "Qatar", "Saudi Arabia", "Syrian Arab Republic",
    "Turkey", "United Arab Emirates", "Yemen"
}

oceania = {
    "American Samoa", "Australia", "Cook Islands", "Fiji", "Kiribati",
    "Marshall Islands", "Micronesia (Federated States of)", "Nauru", "New Zealand",
    "Niue", "Norfolk Island", "Palau", "Samoa", "Solomon Islands", "Tokelau",
    "Tonga", "Tuvalu", "Vanuatu", "Guam", "Christmas Island", "Cocos (Keeling) Islands",
    "Pitcairn",
    # Assign Antarctica and Heard Island to Oceania as a best-fit:
    "Antarctica", "Heard Island and McDonald Islands"
}

south_america = {
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana",
    "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela (Bolivarian Republic of)",
    "Falkland Islands (Malvinas)", "South Georgia and the South Sandwich Islands",
    "French Guiana"
}

africa = {
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde",
    "Cameroon", "Central African Republic", "Chad", "Comoros", "Congo", "Congo, Democratic Republic of the",
    "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia",
    "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho",
    "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
    "Mayotte", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Réunion",
    "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
    "Somalia", "South Africa", "South Sudan", "Sudan", "Togo", "Tunisia", "Uganda",
    "Zambia", "Zimbabwe", "British Indian Ocean Territory", "Bouvet Island", "Western Sahara"
}

def assign_region(country_name):
    if country_name in north_america:
        return "North America"
    elif country_name in europe:
        return "Europe"
    elif country_name in asia:
        return "Asia"
    elif country_name in middle_east:
        return "Middle East"
    elif country_name in oceania:
        return "Oceania"
    elif country_name in south_america:
        return "South America"
    elif country_name in africa:
        return "Africa"
    else:
        # If a country is not matched, assign "Unknown"
        return "Unknown"

# Prepare list with region information
output_rows = []
for name, code in countries:
    region = assign_region(name)
    output_rows.append((name, code, region))

# Sort the list (first by Region, then by Country Name)
output_rows.sort(key=lambda x: (x[2], x[0]))

# Write to CSV file
with open("countries_by_region.csv", "w", newline='', encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["Country Name", "Alpha-2 Code", "Region"])
    for row in output_rows:
        writer.writerow(row)

print("CSV file 'countries_by_region.csv' has been created with 245 entries.")
