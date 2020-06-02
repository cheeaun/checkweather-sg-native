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
    @IBOutlet weak var loadErrorLabel: UILabel!

    let radarImageURL = "https://rainshot.checkweather.sg/"

    var timer = Timer()

    let cache = ImageCache.default
    
    func debugImage() {
        #if DEBUG
        let date = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss a"
        let time = formatter.string(from: date)
        print("Load Image: \(time)")
        #endif
    }
    
    func loadImage() {
        self.loadErrorLabel.isHidden = true
        let imageUrl = URL(string: self.radarImageURL)
        self.radarImage.kf.setImage(with: imageUrl, options: [
            .fromMemoryCacheOrRefresh,
            .transition(.fade(1)),
            .keepCurrentImageWhileLoading
        ]) { result in
            switch result {
            case .success(_): break
            case .failure(_):
                #if DEBUG
                print("Image load FAIL")
                #endif
                self.radarImage.image = nil
                self.loadErrorLabel.isHidden = false
            }
        }
        
        self.debugImage()
    }

    func loadNextImage() {
        self.loadErrorLabel.isHidden = true
        let cacheType = cache.imageCachedType(forKey: self.radarImageURL)
        #if DEBUG
        print("Cache Type: \(cacheType)")
        #endif

        let imageUrl = URL(string: self.radarImageURL)
        if cacheType == .disk {
            cache.retrieveImageInDiskCache(forKey: self.radarImageURL) { result in
                switch result {
                    case .success(let image):
                        DispatchQueue.main.async {
                            self.radarImage.kf.setImage(
                                with: imageUrl,
                                placeholder: image,
                                options: [
                                    .forceRefresh,
                                    .transition(.fade(1)),
                                    .keepCurrentImageWhileLoading
                                ]
                            ) { result in
                                switch result {
                                case .success(_): break
                                case .failure(_):
                                    #if DEBUG
                                    print("Image load FAIL")
                                    #endif
                                    self.radarImage.image = nil
                                    self.loadErrorLabel.isHidden = false
                                }
                            }
                        }
                    case .failure(_):
                        self.loadImage()
                }
            }
        } else {
            self.loadImage()
        }
        
        self.debugImage()
    }
  
    func loadImageInterval() {
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { timer in
          self.loadImage();
        }
        RunLoop.main.add(timer, forMode: .common)
    }

    @objc func tap(_ sender: UITapGestureRecognizer) {
        let appURL = NSURL(string: "checkweathersg://")
        extensionContext?.open(appURL! as URL, completionHandler: nil)
    }
      
    override func viewDidLoad() {
        super.viewDidLoad()
        extensionContext?.widgetLargestAvailableDisplayMode = .expanded

        self.view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(self.tap(_:))))

        self.radarImage.kf.indicatorType = .activity
        
        self.cache.memoryStorage.config.countLimit = 2
        self.cache.memoryStorage.config.expiration = .seconds(59)
//        self.cache.diskStorage.config.expiration = .seconds(900)
        
        print("viewDidLoad")
        self.loadNextImage()
    }
  
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.loadImageInterval()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        timer.invalidate()
    }
  
    func widgetActiveDisplayModeDidChange(_ activeDisplayMode: NCWidgetDisplayMode, withMaximumSize maxSize: CGSize) {
        let expanded = activeDisplayMode == .expanded
        let height = maxSize.width * 120 / 217
        preferredContentSize = expanded ? CGSize(width: maxSize.width, height: height) : maxSize
    }
    
    func widgetPerformUpdate(completionHandler: (@escaping (NCUpdateResult) -> Void)) {
        // Perform any setup necessary in order to update the view.
        
        // If an error is encountered, use NCUpdateResult.Failed
        // If there's no update required, use NCUpdateResult.NoData
        // If there's an update, use NCUpdateResult.NewData
        
        completionHandler(NCUpdateResult.newData)
    }
    
}
