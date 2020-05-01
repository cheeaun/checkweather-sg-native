//
//  TodayViewController.swift
//  TodayExtension
//
//  Created by Lim Chee Aun on 13/4/2020.
//

import UIKit
import NotificationCenter

class TodayViewController: UIViewController, NCWidgetProviding {
  
    @IBOutlet weak var radarImage: UIImageView!
    @IBOutlet weak var loader: UIActivityIndicatorView!
  
    let radarImageURL = "https://rainshot.now.sh/api/radar"

    var timer = Timer()
  
    func loadImage() {
        self.loader.startAnimating()
        
        DispatchQueue.global().async {
            let imageUrl = URL(string: self.radarImageURL)
            let imageData = try? Data(contentsOf: imageUrl!)
            if let image = imageData {
                DispatchQueue.main.async {
                    self.radarImage.image = UIImage(data: image)
                }
                
                // Logging
                let date = Date()
                let formatter = DateFormatter()
                formatter.dateFormat = "HH:mm:ss a"
                let time = formatter.string(from: date)
                print("\(time) \(image.count)")
            }
            DispatchQueue.main.async {
                self.loader.stopAnimating()
            }
        }
    }
  
    func renderImage() {
        self.loadImage()
        timer = Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { timer in
          self.loadImage();
        }
        RunLoop.main.add(timer, forMode: .common)
    }
      
    override func viewDidLoad() {
        super.viewDidLoad()
        extensionContext?.widgetLargestAvailableDisplayMode = .expanded
    }
  
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.renderImage()
    }
  
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        timer.invalidate()
        self.loader.stopAnimating()
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
