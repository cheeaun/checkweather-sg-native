//
//  WeatherWidget.swift
//  WeatherWidget
//
//  Created by Lim Chee Aun on 6/12/2020.
//

import WidgetKit
import SwiftUI

extension UIImage {
    public static func loadFrom(url: URL, completion: @escaping (_ image: UIImage?) -> ()) {
        DispatchQueue.global().async {
            if let data = try? Data(contentsOf: url) {
                DispatchQueue.main.async {
                    completion(UIImage(data: data))
                }
            } else {
                DispatchQueue.main.async {
                    completion(nil)
                }
            }
        }
    }
}

struct Provider: TimelineProvider {
    let radarImageURL = "https://rainshot.checkweather.sg/"

    func placeholder(in context: Context) -> RadarEntry {
        RadarEntry()
    }

    func getSnapshot(in context: Context, completion: @escaping (RadarEntry) -> ()) {
        completion(RadarEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let date = Date()

        guard let url = URL(string: self.radarImageURL) else { return }

        UIImage.loadFrom(url: url) { image in
            if let image = image {
                let img = Image(uiImage: image)
                let entry = RadarEntry(date: date, image: img, live: true)
                let nextUpdateDate = Calendar.current.date(byAdding: .minute, value: 3, to: date)!
                let timeline = Timeline(
                  entries: [entry],
                  policy: .after(nextUpdateDate)
                )
                completion(timeline)
            } else {
                let entry = RadarEntry()
                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
            }
        }
    }
}

struct RadarEntry: TimelineEntry {
    var date: Date = Date()
    var image: Image = Image(uiImage: UIImage(named: "radar")!)
    var live: Bool = false
}

struct WeatherWidgetEntryView : View {
    @Environment(\.widgetFamily) var family: WidgetFamily
    var entry: Provider.Entry

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Color(.darkGray)
                .overlay(
                    entry.image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .blur(radius: family == .systemLarge ? 10 : 5)
                        .brightness(0.1)
                )
            Color.clear.overlay(
                entry.image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .shadow(
                      color: .black,
                      radius: family == .systemLarge ? 60.0 : 30.0
                    )
            )
            if entry.live {
                Text(entry.date, style: .relative)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .padding(.bottom, 5)
                    .padding(.leading)
            }
        }
    }
}

@main
struct WeatherWidget: Widget {
    let kind: String = "WeatherWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeatherWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Weather and Rain Radar")
        .description("This widget shows the weather and rain radar")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct WeatherWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            WeatherWidgetEntryView(entry: RadarEntry())
                .previewContext(WidgetPreviewContext(family: .systemSmall))
            WeatherWidgetEntryView(entry: RadarEntry())
                .previewContext(WidgetPreviewContext(family: .systemMedium))
            WeatherWidgetEntryView(entry: RadarEntry())
                .previewContext(WidgetPreviewContext(family: .systemLarge))
        }
    }
}
