import csv
import json


def main():
    all_bands = []
    with open('bands_and_urls.csv', 'rU') as f:
        band_reader = csv.reader(f)
        for row in band_reader:
            name, website, facebook, youtube, sonicbids, something, city, state, country = row

            all_bands.append({
                'name': name,
                'website': website,
                'facebook': facebook,
                'youtube': youtube,
                'sonicbids': sonicbids,
                'something': something,
                'city': city,
                'state': state,
                'country': country,
            })

    with open('bands_and_urls.json', 'w') as f:
        json.dump(all_bands, f, indent=2, sort_keys=True)


if __name__ == '__main__':
    main()
