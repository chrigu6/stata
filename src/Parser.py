'''
Created on 05.08.2013

@author: Chrigu
'''

import urllib2
from bs4 import BeautifulSoup
import re

if __name__ == '__main__':
    
    #timestamp = "1375567201"
    #pageContent = urllib2.urlopen("http://www.easportsworld.com/en_US/clubs/partial/401A0001/1284/match-results?type=all&timestamp=" + timestamp, timeout=60)
    
    soup = BeautifulSoup(open("C:\\Users\\Chrigu\\Desktop\\test.html"))
    
    if (soup.prettify().find("There are no match results to display for this date") == -1):
        #print pageContent.read().find("match-spinner")
        for div in soup.find_all(id=re.compile("match-detail-container-.*")):
            print (div)
              
    else:
        print "No Matches!"
