//
//  TodayViewController.swift
//  TodayExtension
//
//  Created by Lim Chee Aun on 13/4/2020.
//

import UIKit
import NotificationCenter
import Kingfisher

class TodayViewController: UIViewController, NCWidgetProviding {
  
    @IBOutlet weak var radarImage: UIImageView!
  
    let radarImageURL = "https://rainshot.now.sh/api/radar"

    var timer = Timer()
  
    func loadImage() {
        let imageUrl = URL(string: self.radarImageURL)
        self.radarImage.kf.setImage(with: imageUrl, options: [
          .transition(.fade(1)),
          .forceTransition,
          .keepCurrentImageWhileLoading
        ])
        
        #if DEBUG
        let date = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss a"
        let time = formatter.string(from: date)
        print("\(time)")
        #endif
    }
  
    func renderImage() {
        self.loadImage()
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { timer in
          self.loadImage();
        }
        RunLoop.main.add(timer, forMode: .common)
    }
      
    override func viewDidLoad() {
        super.viewDidLoad()
        extensionContext?.widgetLargestAvailableDisplayMode = .expanded
      
        self.radarImage.kf.indicatorType = .activity
      
        let cache = ImageCache.default
        cache.memoryStorage.config.countLimit = 2
        cache.memoryStorage.config.expiration = .seconds(59)
        cache.diskStorage.config.expiration = .seconds(59)
    }
  
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.renderImage()
    }
  
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        timer.invalidate()
    }
  
    func widgetActiveDisplayModeDidChange(_ activeDisplayMode: NCWidgetDisplayMode, withMaximumSize maxSize: CGSize) {
        let expanded = activeDisplayMode == .expanded
        preferredContentSize = expanded ? CGSize(width: maxSize.width, height: 200) : maxSize
    }
        
    func widgetPerformUpdate(completionHandler: (@escaping (NCUpdateResult) -> Void)) {
        // Perform any setup necessary in order to update the view.
        
        // If an error is encountered, use NCUpdateResult.Failed
        // If there's no update required, use NCUpdateResult.NoData
        // If there's an update, use NCUpdateResult.NewData
        
        completionHandler(NCUpdateResult.newData)
    }
    
}
